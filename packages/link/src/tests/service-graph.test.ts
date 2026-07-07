import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
} from "bun:test";
import { PoolManager } from "@damatjs/services";
import { defineLink } from "../defineLink";
import { createLinkService } from "../service";
import { setLinkModuleResolver } from "../resolver";
import type { LinkDefinition } from "../types";

/**
 * Unit tests for the cross-module link service (`graph` / `create` / `dismiss` /
 * `list` / `fetch`) with NO live database. We satisfy the `ModuleService`
 * constructor by initialising `PoolManager` with a fake pool + entity manager,
 * then shadow each junction accessor on the instance with an in-memory fake
 * pivot. Module hydration is wired through `setLinkModuleResolver`.
 */

const fakeEm: any = { registerModel: () => {} };
const fakePool: any = { query: async () => ({ rows: [] }) };
const fakeLogger: any = {
  info() {},
  error() {},
  warn() {},
  debug() {},
  child() {
    return fakeLogger;
  },
};

beforeAll(() => {
  PoolManager.reset();
  PoolManager.setup({
    pool: fakePool,
    logger: fakeLogger,
    connectionManager: {} as any,
  });
  PoolManager.setEntityManager(fakeEm);
});

afterEach(() => setLinkModuleResolver(undefined as any));

/** An in-memory junction table standing in for a real pivot ModelMethods. */
function makePivot(rows: Record<string, any>[] = []) {
  const store = rows.map((r) => ({ deleted_at: null, ...r }));
  const matches = (r: any, where: Record<string, any>) =>
    Object.entries(where).every(([k, v]) => {
      if (v && typeof v === "object" && "in" in v) {
        return (v.in as any[]).includes(r[k]);
      }
      return r[k] === v;
    });
  return {
    store,
    async find({ where }: any) {
      return store.find((r) => matches(r, where)) ?? null;
    },
    async findMany({ where, select }: any) {
      let out = store.filter((r) => matches(r, where ?? {}));
      if (select) {
        out = out.map((r) => {
          const o: any = {};
          for (const k of select) o[k] = r[k];
          return o;
        });
      }
      return out.map((r) => ({ ...r }));
    },
    async create({ data }: any) {
      const row = { id: `pv_${store.length}`, deleted_at: null, ...data };
      store.push(row);
      return { ...row };
    },
    /** Mirrors INSERT … ON CONFLICT (pair) DO UPDATE SET <set> RETURNING *. */
    async upsert({ data, set }: any) {
      const existing = store.find((r) => matches(r, data));
      if (existing) {
        Object.assign(existing, set ?? {});
        return { ...existing };
      }
      const row = { id: `pv_${store.length}`, deleted_at: null, ...data };
      store.push(row);
      return { ...row };
    },
    async softDelete({ where }: any) {
      const affected = store.filter((r) => matches(r, where));
      for (const r of affected) r.deleted_at = new Date();
      return affected.map((r) => ({ ...r }));
    },
    async restore({ where }: any) {
      const affected = store.filter((r) => matches(r, where));
      for (const r of affected) r.deleted_at = null;
      return affected.map((r) => ({ ...r }));
    },
    getModelDefinition: () => ({ toTableSchema: () => ({ relations: [] }) }),
  };
}

/**
 * Build a LinkService instance and shadow its junction accessors with the
 * provided in-memory pivots (keyed by `link.pivotName`).
 */
function buildService(
  links: LinkDefinition[],
  pivots: Record<string, ReturnType<typeof makePivot>>,
) {
  const Svc = createLinkService(links);
  const svc: any = new Svc();
  for (const [name, pivot] of Object.entries(pivots)) {
    Object.defineProperty(svc, name, { value: pivot, configurable: true });
  }
  return svc;
}

/**
 * A fake module accessor object: each model key maps to a methods object with
 * `findMany` (filters an in-memory table by an `{ id: { in: [...] } }` /
 * equality where) and `getModelDefinition` exposing declared relations.
 */
function makeModule(
  tables: Record<
    string,
    {
      rows: Record<string, any>[];
      relations?: { from: string }[];
      /** Real primary key column, when it is not the default `id`. */
      primaryKey?: string;
    }
  >,
) {
  const accessors: Record<string, any> = {};
  for (const [model, { rows, relations, primaryKey }] of Object.entries(tables)) {
    accessors[model] = {
      lastFindMany: undefined as any,
      async findMany(opts: any = {}) {
        this.lastFindMany = opts;
        let out = rows.filter((r) => {
          const where = opts.where ?? {};
          return Object.entries(where).every(([k, v]) => {
            if (v && typeof v === "object" && "in" in (v as any)) {
              return (v as any).in.includes(r[k]);
            }
            return r[k] === v;
          });
        });
        if (typeof opts.skip === "number") out = out.slice(opts.skip);
        if (typeof opts.take === "number") out = out.slice(0, opts.take);
        // Attach requested intra-module relations verbatim.
        return out.map((r) => ({ ...r }));
      },
      getModelDefinition: () => ({
        toTableSchema: () => ({
          relations: relations ?? [],
          columns: [{ name: primaryKey ?? "id", primaryKey: true }],
        }),
      }),
    };
  }
  return accessors;
}

// ---------------------------------------------------------------------------

describe("LinkService.graph — cross-module resolution", () => {
  const link = defineLink(
    { module: "blog", model: "author", field: "authors" },
    { module: "store", model: "book", field: "books" },
  );

  test("hydrates linked rows in a list field and prunes to requested columns", async () => {
    const pivot = makePivot([
      { author_id: "a1", book_id: "b1" },
      { author_id: "a1", book_id: "b2" },
    ]);
    const svc = buildService([link], { [link.pivotName]: pivot });

    const registry: Record<string, any> = {
      blog: makeModule({ author: { rows: [{ id: "a1", name: "Tolkien", secret: "s" }] } }),
      store: makeModule({
        book: {
          rows: [
            { id: "b1", title: "Hobbit", isbn: "x" },
            { id: "b2", title: "LOTR", isbn: "y" },
          ],
        },
      }),
    };
    setLinkModuleResolver((id) => registry[id] ?? null);

    const res = await svc.graph({
      module: "blog",
      entity: "author",
      fields: ["name", "books.title"],
      filters: { id: "a1" },
    });

    expect(res.data).toHaveLength(1);
    const row = res.data[0];
    // root pruned to name + id (+ child key books)
    expect(row.name).toBe("Tolkien");
    expect(row.secret).toBeUndefined();
    expect(row.books.map((b: any) => b.title).sort()).toEqual(["Hobbit", "LOTR"]);
    // child pruned to title + id (isbn dropped)
    expect(row.books[0].isbn).toBeUndefined();
    expect(row.books[0].id).toBeDefined();
  });

  test("prunes each node to its REAL primary key (non-'id'), never force-adding id", async () => {
    // The `store.product` model is keyed on `sku`, not `id`. The resolver must
    // thread that PK into pruning so `sku` survives and the stray `id` on the
    // row is dropped rather than force-kept.
    const skuLink = defineLink(
      { module: "store", model: "product", field: "products", primaryKey: "sku" },
      { module: "warehouse", model: "bin", field: "bins" },
    );
    const pivot = makePivot([]);
    const svc = buildService([skuLink], { [skuLink.pivotName]: pivot });
    setLinkModuleResolver((id) =>
      id === "store"
        ? makeModule({
            product: {
              rows: [{ sku: "S1", id: "stray", name: "Widget", secret: "x" }],
              primaryKey: "sku",
            },
          })
        : null,
    );

    const res = await svc.graph({
      module: "store",
      entity: "product",
      fields: ["name"],
      filters: {},
    });

    expect(res.data).toHaveLength(1);
    const row = res.data[0];
    expect(row.sku).toBe("S1"); // real PK survives
    expect(row.name).toBe("Widget");
    expect(row.id).toBeUndefined(); // stray "id" NOT force-added
    expect(row.secret).toBeUndefined();
  });

  test("passes intra-module relation child fields through to the owning service's include", async () => {
    const pivot = makePivot([{ author_id: "a1", book_id: "b1" }]);
    const svc = buildService([link], { [link.pivotName]: pivot });

    // The blog/author model declares an intra-module relation "profile"; the
    // graph must classify it as a relation (not a cross-module link) by reading
    // the model definition's relations list.
    setLinkModuleResolver((id) =>
      ({
        blog: makeModule({
          author: {
            rows: [{ id: "a1", name: "Tolkien", profile: { bio: "writer" } }],
            relations: [{ from: "profile" }],
          },
        }),
        store: makeModule({ book: { rows: [{ id: "b1", title: "Hobbit" }] } }),
      })[id] ?? null,
    );

    const res = await svc.graph({
      module: "blog",
      entity: "author",
      fields: ["name", "profile.bio", "books.title"],
      filters: { id: "a1" },
    });

    expect(res.data).toHaveLength(1);
    expect(res.data[0].name).toBe("Tolkien");
    // The relation field is included by the owning service.
    expect(res.data[0].profile).toEqual({ bio: "writer" });
    expect(res.data[0].books.map((b: any) => b.title)).toEqual(["Hobbit"]);
  });

  test("leaves a link field empty when the row has no junction entries", async () => {
    // No pivot rows: the link child resolves to an empty list/null without ever
    // building the linked-row index (the otherRows map runs over an empty set).
    const pivot = makePivot([]);
    const svc = buildService([link], { [link.pivotName]: pivot });
    setLinkModuleResolver((id) =>
      ({
        blog: makeModule({ author: { rows: [{ id: "a1", name: "Solo" }] } }),
        store: makeModule({ book: { rows: [{ id: "b1", title: "Hobbit" }] } }),
      })[id] ?? null,
    );

    const res = await svc.graph({
      module: "blog",
      entity: "author",
      fields: ["name", "books.title"],
      filters: { id: "a1" },
    });

    expect(res.data).toHaveLength(1);
    expect(res.data[0].name).toBe("Solo");
    // isList endpoint with no links -> empty array.
    expect(res.data[0].books).toEqual([]);
  });

  test("uses the field alias as the output key, not the model name", async () => {
    const pivot = makePivot([{ author_id: "a1", book_id: "b1" }]);
    const svc = buildService([link], { [link.pivotName]: pivot });
    setLinkModuleResolver((id) =>
      ({
        blog: makeModule({ author: { rows: [{ id: "a1", name: "x" }] } }),
        store: makeModule({ book: { rows: [{ id: "b1", title: "t" }] } }),
      })[id] ?? null,
    );

    const res = await svc.graph({
      module: "blog",
      entity: "author",
      fields: ["*", "books.*"],
      filters: {},
    });
    expect(res.data[0].books).toBeDefined();
    // The alias is "books"; "book" (model) must not appear.
    expect(res.data[0].book).toBeUndefined();
  });

  test("dismissed (soft-deleted) junction rows are excluded", async () => {
    const pivot = makePivot([
      { author_id: "a1", book_id: "b1" },
      { author_id: "a1", book_id: "b2", deleted_at: new Date() },
    ]);
    const svc = buildService([link], { [link.pivotName]: pivot });
    setLinkModuleResolver((id) =>
      ({
        blog: makeModule({ author: { rows: [{ id: "a1", name: "x" }] } }),
        store: makeModule({
          book: { rows: [{ id: "b1", title: "live" }, { id: "b2", title: "dead" }] },
        }),
      })[id] ?? null,
    );

    const res = await svc.graph({
      module: "blog",
      entity: "author",
      fields: ["name", "books.title"],
      filters: {},
    });
    expect(res.data[0].books.map((b: any) => b.title)).toEqual(["live"]);
  });

  test("unknown child fields are ignored, not thrown", async () => {
    const pivot = makePivot([{ author_id: "a1", book_id: "b1" }]);
    const svc = buildService([link], { [link.pivotName]: pivot });
    setLinkModuleResolver((id) =>
      ({
        blog: makeModule({ author: { rows: [{ id: "a1", name: "x" }] } }),
        store: makeModule({ book: { rows: [{ id: "b1", title: "t" }] } }),
      })[id] ?? null,
    );

    const res = await svc.graph({
      module: "blog",
      entity: "author",
      fields: ["name", "ghost.field", "books.title"],
      filters: {},
    });
    expect(res.data[0].ghost).toBeUndefined();
    expect(res.data[0].books).toHaveLength(1);
  });

  test("a non-list endpoint hydrates to a single object (or null)", async () => {
    const single = defineLink(
      { module: "store", model: "cart", field: "cart", isList: false },
      { module: "cust", model: "customer", field: "customer", isList: false },
    );
    const pivot = makePivot([{ cart_id: "c1", customer_id: "u1" }]);
    const svc = buildService([single], { [single.pivotName]: pivot });
    setLinkModuleResolver((id) =>
      ({
        store: makeModule({ cart: { rows: [{ id: "c1" }, { id: "c2" }] } }),
        cust: makeModule({ customer: { rows: [{ id: "u1", name: "joe" }] } }),
      })[id] ?? null,
    );

    const res = await svc.graph({
      module: "store",
      entity: "cart",
      fields: ["*", "customer.name"],
      filters: {},
    });
    const byId = Object.fromEntries(res.data.map((r: any) => [r.id, r]));
    expect(byId.c1.customer).toEqual({ id: "u1", name: "joe" });
    // c2 has no link -> single ref is null, not []
    expect(byId.c2.customer).toBeNull();
  });

  test("empty root result set short-circuits link hydration", async () => {
    const pivot = makePivot([{ author_id: "a1", book_id: "b1" }]);
    const svc = buildService([link], { [link.pivotName]: pivot });
    setLinkModuleResolver((id) =>
      ({
        blog: makeModule({ author: { rows: [] } }),
        store: makeModule({ book: { rows: [{ id: "b1", title: "t" }] } }),
      })[id] ?? null,
    );
    const res = await svc.graph({
      module: "blog",
      entity: "author",
      fields: ["name", "books.title"],
      filters: { id: "nope" },
    });
    expect(res.data).toEqual([]);
  });

  test("throws when the starting module is not registered", async () => {
    const pivot = makePivot([]);
    const svc = buildService([link], { [link.pivotName]: pivot });
    setLinkModuleResolver(() => null); // nothing resolves
    expect(
      svc.graph({ module: "blog", entity: "author", fields: ["name"], filters: {} }),
    ).rejects.toThrow(/not registered/);
  });

  test("throws when the starting entity has no model accessor", async () => {
    const pivot = makePivot([]);
    const svc = buildService([link], { [link.pivotName]: pivot });
    // "author" participates in the link, but the module exposes no accessor.
    setLinkModuleResolver((id) => (id === "blog" ? { somethingElse: {} } : null));
    expect(
      svc.graph({ module: "blog", entity: "author", fields: ["name"], filters: {} }),
    ).rejects.toThrow(/no model accessor/);
  });

  test("refuses a root entity that is not part of any registered link", async () => {
    const pivot = makePivot([]);
    const svc = buildService([link], { [link.pivotName]: pivot });
    // The module resolves fine — but "secretModel" is on no link, so the link
    // service must not become a read path into it.
    setLinkModuleResolver((id) =>
      id === "blog"
        ? makeModule({ secretModel: { rows: [{ id: "s1", secret: "x" }] } })
        : null,
    );
    expect(
      svc.graph({ module: "blog", entity: "secretModel", fields: ["*"], filters: {} }),
    ).rejects.toThrow(/not part of any registered link/);
  });
});

describe("LinkService.graph — pagination & ordering passthrough", () => {
  const link = defineLink(
    { module: "blog", model: "author", field: "authors" },
    { module: "store", model: "book", field: "books" },
  );

  test("skip without take is forwarded to the root findMany (no take coercion)", async () => {
    const pivot = makePivot([]);
    const svc = buildService([link], { [link.pivotName]: pivot });
    const authorModule = makeModule({
      author: { rows: [{ id: "a1" }, { id: "a2" }, { id: "a3" }] },
    });
    setLinkModuleResolver((id) => (id === "blog" ? authorModule : null));

    const res = await svc.graph({
      module: "blog",
      entity: "author",
      fields: ["id"],
      pagination: { skip: 1 },
    });
    // skip=1 honored, take left undefined
    expect(authorModule.author.lastFindMany.skip).toBe(1);
    expect(authorModule.author.lastFindMany.take).toBeUndefined();
    expect(res.data.map((r: any) => r.id)).toEqual(["a2", "a3"]);
  });

  test("orderBy is forwarded verbatim to the root findMany", async () => {
    const pivot = makePivot([]);
    const svc = buildService([link], { [link.pivotName]: pivot });
    const authorModule = makeModule({ author: { rows: [{ id: "a1" }] } });
    setLinkModuleResolver((id) => (id === "blog" ? authorModule : null));
    await svc.graph({
      module: "blog",
      entity: "author",
      fields: ["id"],
      orderBy: [{ column: "name", direction: "DESC" }],
    });
    expect(authorModule.author.lastFindMany.orderBy).toEqual([
      { column: "name", direction: "DESC" },
    ]);
  });
});

describe("LinkService.graph — circular links terminate (no infinite loop)", () => {
  // A links to B and B links to A. Recursion is bounded by the FIELD-TREE depth,
  // not the link-graph topology, so a finite (if deep) field path must always
  // terminate. This regression-locks that property.
  // The field on an endpoint names how the OTHER side is exposed. So to read
  // `a.bs` (a's linked B rows) the B endpoint carries field "bs", and to read
  // `b.as` the A endpoint carries field "as".
  const ab = defineLink(
    { module: "m", model: "a", field: "as" },
    { module: "m", model: "b", field: "bs" },
  );

  function wire(pivot: ReturnType<typeof makePivot>) {
    const svc = buildService([ab], { [ab.pivotName]: pivot });
    const mod = makeModule({
      a: { rows: [{ id: "a1", name: "A1" }] },
      b: { rows: [{ id: "b1", name: "B1" }] },
    });
    setLinkModuleResolver((id) => (id === "m" ? mod : null));
    return svc;
  }

  test("a deep alternating path a->bs->as->bs resolves and terminates", async () => {
    // pivot connects a1<->b1 (both directions resolvable from same junction)
    const pivot = makePivot([{ a_id: "a1", b_id: "b1" }]);
    const svc = wire(pivot);

    const res = await svc.graph({
      module: "m",
      entity: "a",
      // a -> bs (B) -> as (A) -> bs (B): four levels deep, must not hang.
      fields: ["name", "bs.name", "bs.as.name", "bs.as.bs.name"],
      filters: { id: "a1" },
    });

    expect(res.data).toHaveLength(1);
    const a = res.data[0];
    expect(a.name).toBe("A1");
    expect(a.bs).toHaveLength(1);
    expect(a.bs[0].name).toBe("B1");
    expect(a.bs[0].as).toHaveLength(1);
    expect(a.bs[0].as[0].name).toBe("A1");
    expect(a.bs[0].as[0].bs).toHaveLength(1);
    expect(a.bs[0].as[0].bs[0].name).toBe("B1");
  });

  test("a self-link on the SAME module+model is rejected at definition time", () => {
    // Both sides resolve to identical junction columns even after module
    // qualification, so defineLink refuses it — guarding against an ambiguous
    // self-referential junction. (A model linking to itself must use a distinct
    // `pivotTable`/columns or two distinct model keys.)
    expect(() =>
      defineLink(
        { module: "m", model: "node", field: "parents" },
        { module: "m", model: "node", field: "children" },
      ),
    ).toThrow(/both sides resolve to the junction column/);
  });
});

describe("LinkService.create / dismiss / list / fetch", () => {
  const link = defineLink(
    { module: "blog", model: "author", field: "authors" },
    { module: "store", model: "book", field: "books" },
  );
  const from = { module: "blog", model: "author", id: "a1" };
  const to = { module: "store", model: "book", id: "b1" };

  let pivot: ReturnType<typeof makePivot>;
  let svc: any;

  beforeEach(() => {
    pivot = makePivot([]);
    svc = buildService([link], { [link.pivotName]: pivot });
  });

  test("create inserts a junction row", async () => {
    const row = await svc.create(from, to);
    expect(row.author_id).toBe("a1");
    expect(row.book_id).toBe("b1");
    expect(pivot.store).toHaveLength(1);
  });

  test("create is a single atomic upsert (no check-then-insert window)", async () => {
    const p: any = makePivot([]);
    p.find = async () => {
      throw new Error("find must not be called by create");
    };
    p.create = async () => {
      throw new Error("create must not be called by create");
    };
    p.restore = async () => {
      throw new Error("restore must not be called by create");
    };
    const s = buildService([link], { [link.pivotName]: p });
    const row = await s.create(from, to);
    expect(row.author_id).toBe("a1");
    expect(row.book_id).toBe("b1");
  });

  test("create is idempotent for an existing live link", async () => {
    await svc.create(from, to);
    await svc.create(from, to);
    const live = pivot.store.filter((r) => r.deleted_at == null);
    expect(live).toHaveLength(1);
  });

  test("create revives a previously dismissed link instead of duplicating", async () => {
    await svc.create(from, to);
    await svc.dismiss(from, to);
    expect(pivot.store[0].deleted_at).not.toBeNull();
    const revived = await svc.create(from, to);
    expect(revived.deleted_at).toBeNull();
    expect(pivot.store).toHaveLength(1); // no duplicate inserted
  });

  test("dismiss returns the number of rows soft-deleted", async () => {
    await svc.create(from, to);
    const n = await svc.dismiss(from, to);
    expect(n).toBe(1);
    // dismissing again affects nothing (already deleted_at != null)
    expect(await svc.dismiss(from, to)).toBe(0);
  });

  test("list returns only live junction rows for the from side", async () => {
    await svc.create(from, to);
    await svc.create(from, { module: "store", model: "book", id: "b2" });
    await svc.dismiss(from, { module: "store", model: "book", id: "b2" });
    const rows = await svc.list(from, { module: "store", model: "book" });
    expect(rows).toHaveLength(1);
    expect(rows[0].book_id).toBe("b1");
  });

  test("listLinkedIds returns only the linked to-side ids for live rows", async () => {
    await svc.create(from, to);
    await svc.create(from, { module: "store", model: "book", id: "b2" });
    await svc.create(from, { module: "store", model: "book", id: "b3" });
    await svc.dismiss(from, { module: "store", model: "book", id: "b3" });

    const ids = await svc.listLinkedIds(from, { module: "store", model: "book" });
    expect(ids.sort()).toEqual(["b1", "b2"]);
  });

  test("fetch hydrates linked rows through the target module service", async () => {
    await svc.create(from, to);
    setLinkModuleResolver((id) =>
      id === "store"
        ? makeModule({ book: { rows: [{ id: "b1", title: "Hobbit" }] } })
        : null,
    );
    const books = await svc.fetch(from, { module: "store", model: "book" });
    expect(books).toEqual([{ id: "b1", title: "Hobbit" }]);
  });

  test("fetch resolves the target module from the link when `to` omits its module", async () => {
    await svc.create(from, to);
    setLinkModuleResolver((id) =>
      id === "store"
        ? makeModule({ book: { rows: [{ id: "b1", title: "Hobbit" }] } })
        : null,
    );
    // `to` carries only the model, so fetch must fall back to the link's other
    // endpoint module ("store").
    const books = await svc.fetch(from, { model: "book" } as any);
    expect(books).toEqual([{ id: "b1", title: "Hobbit" }]);
  });

  test("fetch works in the reverse direction (to -> from endpoint)", async () => {
    await svc.create(from, to);
    setLinkModuleResolver((id) =>
      id === "blog"
        ? makeModule({ author: { rows: [{ id: "a1", name: "Tolkien" }] } })
        : null,
    );
    const authors = await svc.fetch(
      { module: "store", model: "book", id: "b1" },
      { module: "blog", model: "author" },
    );
    expect(authors).toEqual([{ id: "a1", name: "Tolkien" }]);
  });

  test("fetch returns [] when there are no linked ids (no module call)", async () => {
    let called = false;
    setLinkModuleResolver(() => {
      called = true;
      return makeModule({ book: { rows: [] } });
    });
    const books = await svc.fetch(from, { module: "store", model: "book" });
    expect(books).toEqual([]);
    expect(called).toBe(false);
  });

  test("fetch throws a clear error when the target accessor is missing", async () => {
    await svc.create(from, to);
    setLinkModuleResolver((id) =>
      id === "store" ? { somethingElse: {} } : null,
    );
    expect(svc.fetch(from, { module: "store", model: "book" })).rejects.toThrow(
      /no model accessor "book"/,
    );
  });

  test("create/list throw for an unregistered link pair", async () => {
    expect(() =>
      svc.create(from, { module: "x", model: "ghost", id: "g1" }),
    ).toThrow(/No link defined/);
  });
});




