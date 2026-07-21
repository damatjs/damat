import { describe, it, expect } from "bun:test";
import { ModelMethods } from "../../service/methods";

/**
 * Cascade delete/softDelete tests.
 *
 * These drive a small in-memory database (`MemTable`) wired into a fake entity
 * manager that resolves repositories AND model definitions by table name, and
 * whose `transaction()` snapshots every table and rolls them back on error.
 * That lets us exercise the real recursive traversal, the onDelete rules, the
 * cycle guard, and atomic rollback without a live Postgres.
 */

type Row = Record<string, any>;

// --- where matcher: equality + { in: [...] } --------------------------------

function matches(row: Row, where: Record<string, any>): boolean {
  return Object.entries(where).every(([col, cond]) => {
    if (cond && typeof cond === "object" && "in" in cond) {
      return (cond.in as any[]).includes(row[col]);
    }
    return row[col] === cond;
  });
}

// --- in-memory table ---------------------------------------------------------

interface MemTableOpts {
  throwOnDelete?: string;
}

class MemTable {
  rows: Row[];
  constructor(
    initial: Row[] = [],
    private opts: MemTableOpts = {},
  ) {
    this.rows = initial.map((r) => ({ ...r }));
  }

  snapshot(): Row[] {
    return this.rows.map((r) => ({ ...r }));
  }
  restore(snap: Row[]): void {
    this.rows = snap.map((r) => ({ ...r }));
  }

  async findMany({ where = {} }: any = {}): Promise<Row[]> {
    return this.rows.filter((r) => matches(r, where)).map((r) => ({ ...r }));
  }

  async delete({ where = {} }: any = {}): Promise<number> {
    if (this.opts.throwOnDelete) throw new Error(this.opts.throwOnDelete);
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => !matches(r, where));
    return before - this.rows.length;
  }

  async update({ set, where = {} }: any): Promise<Row[]> {
    const updated: Row[] = [];
    for (const r of this.rows) {
      if (matches(r, where)) {
        Object.assign(r, set);
        updated.push({ ...r });
      }
    }
    return updated;
  }

  async count(where: Record<string, any> = {}): Promise<number> {
    return this.rows.filter((r) => matches(r, where)).length;
  }
}

// --- model + world factories -------------------------------------------------

function defModel(opts: {
  name: string;
  deletedAtField?: string;
  relations?: any[];
}) {
  return {
    _name: opts.name,
    _deletedAtField: opts.deletedAtField,
    toTableSchema: () => ({
      relations: opts.relations ?? [],
      columns: [{ name: "id", primaryKey: true }],
    }),
  } as any;
}

interface TableSpec {
  model: any;
  rows?: Row[];
  tableOpts?: MemTableOpts;
}

function makeWorld(spec: Record<string, TableSpec>) {
  const tables: Record<string, MemTable> = {};
  const models: Record<string, any> = {};
  for (const [name, def] of Object.entries(spec)) {
    tables[name] = new MemTable(def.rows ?? [], def.tableOpts ?? {});
    models[name] = def.model;
  }

  const getRepository = (name: string) => {
    const t = tables[name];
    if (!t) throw new Error(`no table registered: ${name}`);
    return t as any;
  };

  const txEm = { getRepository };

  const em: any = {
    getRepository,
    getModelRegistry: () => ({
      get: (name: string) =>
        models[name] ? { model: models[name] } : undefined,
    }),
    transaction: async (cb: (tx: any) => Promise<any>) => {
      const snaps: Record<string, Row[]> = {};
      for (const [n, t] of Object.entries(tables)) snaps[n] = t.snapshot();
      try {
        return await cb(txEm);
      } catch (e) {
        for (const [n, t] of Object.entries(tables)) t.restore(snaps[n]);
        throw e;
      }
    },
  };

  return { em, tables };
}

// --- tests -------------------------------------------------------------------

describe("cascade delete", () => {
  it("leaves callers unchanged: no cascade flag deletes only the matched rows", async () => {
    const { em, tables } = makeWorld({
      parent: { model: defModel({ name: "parent" }), rows: [{ id: "p1" }] },
      child: {
        model: defModel({ name: "child" }),
        rows: [{ id: "c1", parent_id: "p1" }],
      },
    });
    const parent = new ModelMethods(defModel({ name: "parent" }), "parent", em);
    const n = await parent.delete({ where: { id: "p1" } });
    expect(n).toBe(1);
    expect(tables.parent.rows).toHaveLength(0);
    // child untouched without cascade
    expect(tables.child.rows).toHaveLength(1);
  });

  it("hard-deletes a 3-level parent → child → grandchild graph", async () => {
    const grandModel = defModel({ name: "grandchild" });
    const childModel = defModel({
      name: "child",
      relations: [
        {
          from: "grandchildren",
          to: "grandchild",
          type: "hasMany",
          mappedBy: ["child"],
        },
      ],
    });
    const parentModel = defModel({
      name: "parent",
      relations: [
        {
          from: "children",
          to: "child",
          type: "hasMany",
          mappedBy: ["parent"],
        },
      ],
    });

    const { em, tables } = makeWorld({
      parent: { model: parentModel, rows: [{ id: "p1" }, { id: "p2" }] },
      child: {
        model: childModel,
        rows: [
          { id: "c1", parent_id: "p1" },
          { id: "c2", parent_id: "p1" },
          { id: "c3", parent_id: "p2" }, // belongs to a different parent
        ],
      },
      grandchild: {
        model: grandModel,
        rows: [
          { id: "g1", child_id: "c1" },
          { id: "g2", child_id: "c1" },
          { id: "g3", child_id: "c2" },
          { id: "g4", child_id: "c3" }, // under the untouched parent
        ],
      },
    });

    const parent = new ModelMethods(parentModel, "parent", em);
    const total = await parent.delete({ where: { id: "p1" }, cascade: true });

    // 1 parent + 2 children + 3 grandchildren
    expect(total).toBe(6);
    expect(tables.parent.rows.map((r) => r.id)).toEqual(["p2"]);
    expect(tables.child.rows.map((r) => r.id)).toEqual(["c3"]);
    expect(tables.grandchild.rows.map((r) => r.id)).toEqual(["g4"]);
  });

  it("respects SET NULL: nulls the child FK instead of deleting", async () => {
    const childModel = defModel({ name: "child" });
    const parentModel = defModel({
      name: "parent",
      relations: [
        {
          from: "children",
          to: "child",
          type: "hasMany",
          mappedBy: ["parent"],
          rule: { onDelete: "SET NULL" },
        },
      ],
    });
    const { em, tables } = makeWorld({
      parent: { model: parentModel, rows: [{ id: "p1" }] },
      child: { model: childModel, rows: [{ id: "c1", parent_id: "p1" }] },
    });

    const parent = new ModelMethods(parentModel, "parent", em);
    await parent.delete({ where: { id: "p1" }, cascade: true });

    expect(tables.parent.rows).toHaveLength(0);
    expect(tables.child.rows).toEqual([{ id: "c1", parent_id: null }]);
  });

  it("respects RESTRICT: throws when children exist and rolls back", async () => {
    const childModel = defModel({ name: "child" });
    const parentModel = defModel({
      name: "parent",
      relations: [
        {
          from: "children",
          to: "child",
          type: "hasMany",
          mappedBy: ["parent"],
          rule: { onDelete: "RESTRICT" },
        },
      ],
    });
    const { em, tables } = makeWorld({
      parent: { model: parentModel, rows: [{ id: "p1" }] },
      child: { model: childModel, rows: [{ id: "c1", parent_id: "p1" }] },
    });

    const parent = new ModelMethods(parentModel, "parent", em);
    await expect(
      parent.delete({ where: { id: "p1" }, cascade: true }),
    ).rejects.toThrow(/RESTRICT/);

    // nothing deleted — parent and child both intact
    expect(tables.parent.rows).toHaveLength(1);
    expect(tables.child.rows).toHaveLength(1);
  });

  it("respects NO ACTION the same way as RESTRICT", async () => {
    const childModel = defModel({ name: "child" });
    const parentModel = defModel({
      name: "parent",
      relations: [
        {
          from: "children",
          to: "child",
          type: "hasMany",
          mappedBy: ["parent"],
          rule: { onDelete: "NO ACTION" },
        },
      ],
    });
    const { em } = makeWorld({
      parent: { model: parentModel, rows: [{ id: "p1" }] },
      child: { model: childModel, rows: [{ id: "c1", parent_id: "p1" }] },
    });
    const parent = new ModelMethods(parentModel, "parent", em);
    await expect(
      parent.delete({ where: { id: "p1" }, cascade: true }),
    ).rejects.toThrow(/NO ACTION/);
  });

  it("RESTRICT allows the delete when there are no children", async () => {
    const childModel = defModel({ name: "child" });
    const parentModel = defModel({
      name: "parent",
      relations: [
        {
          from: "children",
          to: "child",
          type: "hasMany",
          mappedBy: ["parent"],
          rule: { onDelete: "RESTRICT" },
        },
      ],
    });
    const { em, tables } = makeWorld({
      parent: { model: parentModel, rows: [{ id: "p1" }] },
      child: { model: childModel, rows: [] },
    });
    const parent = new ModelMethods(parentModel, "parent", em);
    const n = await parent.delete({ where: { id: "p1" }, cascade: true });
    expect(n).toBe(1);
    expect(tables.parent.rows).toHaveLength(0);
  });

  it("uses an explicit linkedBy FK column when present", async () => {
    const childModel = defModel({ name: "child" });
    const parentModel = defModel({
      name: "parent",
      relations: [
        {
          from: "children",
          to: "child",
          type: "hasMany",
          linkedBy: ["owner_fk"],
        },
      ],
    });
    const { em, tables } = makeWorld({
      parent: { model: parentModel, rows: [{ id: "p1" }] },
      child: { model: childModel, rows: [{ id: "c1", owner_fk: "p1" }] },
    });
    const parent = new ModelMethods(parentModel, "parent", em);
    await parent.delete({ where: { id: "p1" }, cascade: true });
    expect(tables.child.rows).toHaveLength(0);
  });

  it("terminates on a relation cycle (visited-set guard)", async () => {
    // A → B (a_id) and B → A (b_id): a data cycle that would recurse forever
    // without the guard.
    const aModel = defModel({
      name: "a",
      relations: [{ from: "bs", to: "b", type: "hasMany", mappedBy: ["a"] }],
    });
    const bModel = defModel({
      name: "b",
      relations: [{ from: "as", to: "a", type: "hasMany", mappedBy: ["b"] }],
    });
    const { em, tables } = makeWorld({
      a: { model: aModel, rows: [{ id: "a1", b_id: "b1" }] },
      b: { model: bModel, rows: [{ id: "b1", a_id: "a1" }] },
    });
    const a = new ModelMethods(aModel, "a", em);
    const total = await a.delete({ where: { id: "a1" }, cascade: true });
    // terminates and clears both tables
    expect(tables.a.rows).toHaveLength(0);
    expect(tables.b.rows).toHaveLength(0);
    expect(total).toBeGreaterThanOrEqual(2);
  });

  it("rolls back atomically when a delete fails mid-cascade", async () => {
    // parent has two child relations; the second one's table throws on delete.
    // The first child is deleted first (inside the tx) and must be restored.
    const childModel = defModel({ name: "child" });
    const noteModel = defModel({ name: "note" });
    const parentModel = defModel({
      name: "parent",
      relations: [
        {
          from: "children",
          to: "child",
          type: "hasMany",
          mappedBy: ["parent"],
        },
        { from: "notes", to: "note", type: "hasMany", mappedBy: ["parent"] },
      ],
    });
    const { em, tables } = makeWorld({
      parent: { model: parentModel, rows: [{ id: "p1" }] },
      child: { model: childModel, rows: [{ id: "c1", parent_id: "p1" }] },
      note: {
        model: noteModel,
        rows: [{ id: "n1", parent_id: "p1" }],
        tableOpts: { throwOnDelete: "boom" },
      },
    });

    const parent = new ModelMethods(parentModel, "parent", em);
    await expect(
      parent.delete({ where: { id: "p1" }, cascade: true }),
    ).rejects.toThrow(/boom/);

    // everything restored — the child that was deleted mid-cascade is back
    expect(tables.parent.rows).toHaveLength(1);
    expect(tables.child.rows).toHaveLength(1);
    expect(tables.note.rows).toHaveLength(1);
  });

  it("reuses an already-open transaction instead of opening a nested one", async () => {
    const childModel = defModel({ name: "child" });
    const parentModel = defModel({
      name: "parent",
      relations: [
        {
          from: "children",
          to: "child",
          type: "hasMany",
          mappedBy: ["parent"],
        },
      ],
    });
    const { em, tables } = makeWorld({
      parent: { model: parentModel, rows: [{ id: "p1" }] },
      child: { model: childModel, rows: [{ id: "c1", parent_id: "p1" }] },
    });
    let txCalls = 0;
    const origTx = em.transaction;
    em.transaction = async (cb: any) => {
      txCalls += 1;
      return origTx(cb);
    };

    const parent = new ModelMethods(parentModel, "parent", em);
    // simulate the service having already bound a transactional EM
    parent.setTransactionalEm({ getRepository: em.getRepository } as any);
    await parent.delete({ where: { id: "p1" }, cascade: true });

    expect(txCalls).toBe(0); // did NOT open its own transaction
    expect(tables.parent.rows).toHaveLength(0);
    expect(tables.child.rows).toHaveLength(0);
  });
});

describe("cascade softDelete", () => {
  it("soft-deletes the whole graph and returns the matched rows", async () => {
    const childModel = defModel({
      name: "child",
      deletedAtField: "deleted_at",
    });
    const parentModel = defModel({
      name: "parent",
      deletedAtField: "deleted_at",
      relations: [
        {
          from: "children",
          to: "child",
          type: "hasMany",
          mappedBy: ["parent"],
        },
      ],
    });
    const { em, tables } = makeWorld({
      parent: { model: parentModel, rows: [{ id: "p1" }] },
      child: {
        model: childModel,
        rows: [
          { id: "c1", parent_id: "p1" },
          { id: "c2", parent_id: "p1" },
        ],
      },
    });

    const parent = new ModelMethods(parentModel, "parent", em);
    const rows = await parent.softDelete({
      where: { id: "p1" },
      cascade: true,
    });

    // returns the soft-deleted parent rows
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("p1");
    expect(rows[0].deleted_at).toBeInstanceOf(Date);

    // rows are still present but stamped, not removed
    expect(tables.parent.rows[0].deleted_at).toBeInstanceOf(Date);
    expect(tables.child.rows.every((r) => r.deleted_at instanceof Date)).toBe(
      true,
    );
  });

  it("honors a custom deletedAt field name across the graph", async () => {
    const childModel = defModel({
      name: "child",
      deletedAtField: "archived_at",
    });
    const parentModel = defModel({
      name: "parent",
      deletedAtField: "archived_at",
      relations: [
        {
          from: "children",
          to: "child",
          type: "hasMany",
          mappedBy: ["parent"],
        },
      ],
    });
    const { em, tables } = makeWorld({
      parent: { model: parentModel, rows: [{ id: "p1" }] },
      child: { model: childModel, rows: [{ id: "c1", parent_id: "p1" }] },
    });
    const parent = new ModelMethods(parentModel, "parent", em);
    await parent.softDelete({ where: { id: "p1" }, cascade: true });
    expect(tables.parent.rows[0].archived_at).toBeInstanceOf(Date);
    expect(tables.child.rows[0].archived_at).toBeInstanceOf(Date);
    expect(tables.child.rows[0].deleted_at).toBeUndefined();
  });
});
