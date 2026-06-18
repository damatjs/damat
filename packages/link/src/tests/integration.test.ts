import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { model, columns, toModuleSchema } from "@damatjs/orm-model";
import { generateMigration } from "@damatjs/orm-processor";
import { ConnectionManager, testPoolConfig } from "@damatjs/orm-connector";
import { PoolManager, defineModule, ModuleService } from "@damatjs/services";
import { Logger } from "@damatjs/logger";
import { bootstrapDatabase } from "@damatjs/orm-migration";
import { defineLink } from "../defineLink";
import { defineLinkModule } from "../defineLinkModule";
import { collectLinkModels } from "../registry";
import { setLinkModuleResolver } from "../resolver";

const DB = process.env.DATABASE_URL;

/**
 * Live-database integration test. Skipped unless DATABASE_URL is set (matching
 * the rest of the suite), so `bun test` is green without a database. Builds two
 * toy modules + a link between them and exercises the full lifecycle.
 */
describe.skipIf(!DB)("link integration (DATABASE_URL)", () => {
  const Author = model("link_it_authors", {
    id: columns.id({ prefix: "au" }).primaryKey(),
    name: columns.text(),
  });
  const Book = model("link_it_books", {
    id: columns.id({ prefix: "bk" }).primaryKey(),
    title: columns.text(),
  });

  const link = defineLink(
    { module: "blog", model: "author", field: "authors" },
    { module: "store", model: "book", field: "books" },
  );

  let connection: ConnectionManager;
  let blogSvc: any;
  let storeSvc: any;
  let linkSvc: any;

  beforeAll(async () => {
    const logger = new Logger({ prefix: "link-it", timestamp: false });
    connection = new ConnectionManager(
      { ...testPoolConfig(), connectionString: DB! },
      logger,
    );
    const pool = await connection.connect();
    PoolManager.reset();
    PoolManager.setup({ pool, logger, connectionManager: connection });
    await bootstrapDatabase(pool);

    await pool.query(
      `DROP TABLE IF EXISTS "${link.pivotTable}", "link_it_authors", "link_it_books" CASCADE`,
    );
    const ddl = (mods: any[]) =>
      generateMigration
        .generateFromSnapshot(toModuleSchema("t", mods))
        .upStatements.map((s) => (s.trim().endsWith(";") ? s : `${s};`))
        .join("\n");
    await pool.query(ddl([Author, Book]));
    await pool.query(ddl(Object.values(collectLinkModels([link]))));

    const blog = defineModule("blog", {
      service: class extends ModuleService({ models: { author: Author } }) {},
      credentials: () => ({}),
    });
    const store = defineModule("store", {
      service: class extends ModuleService({ models: { book: Book } }) {},
      credentials: () => ({}),
    });
    const linkModule = defineLinkModule([link]);
    blog.init();
    store.init();
    linkModule.init();

    const registry: Record<string, any> = {
      blog: blog.service,
      store: store.service,
      link: linkModule.service,
    };
    setLinkModuleResolver((id) => registry[id] ?? null);

    blogSvc = blog.service;
    storeSvc = store.service;
    linkSvc = linkModule.service;
  });

  afterAll(async () => {
    setLinkModuleResolver(undefined as any);
    PoolManager.reset();
    await connection?.disconnect();
  });

  test("create is idempotent and fetch returns linked rows in both directions", async () => {
    const author = await blogSvc.author.create({ data: { name: "Tolkien" } });
    const b1 = await storeSvc.book.create({ data: { title: "The Hobbit" } });
    const b2 = await storeSvc.book.create({ data: { title: "LOTR" } });

    const a = { module: "blog", model: "author", id: author.id };
    await linkSvc.create(a, { module: "store", model: "book", id: b1.id });
    await linkSvc.create(a, { module: "store", model: "book", id: b2.id });
    await linkSvc.create(a, { module: "store", model: "book", id: b1.id }); // idempotent

    const links = await linkSvc.list(a, { module: "store", model: "book" });
    expect(links).toHaveLength(2);

    const books = await linkSvc.fetch(a, { module: "store", model: "book" });
    expect(books.map((b: any) => b.title).sort()).toEqual(["LOTR", "The Hobbit"]);

    const authors = await linkSvc.fetch(
      { module: "store", model: "book", id: b1.id },
      { module: "blog", model: "author" },
    );
    expect(authors.map((x: any) => x.name)).toEqual(["Tolkien"]);
  });

  test("dismiss soft-deletes and re-create revives", async () => {
    const author = await blogSvc.author.create({ data: { name: "Le Guin" } });
    const book = await storeSvc.book.create({ data: { title: "Earthsea" } });
    const a = { module: "blog", model: "author", id: author.id };
    const b = { module: "store", model: "book", id: book.id };

    await linkSvc.create(a, b);
    expect(await linkSvc.fetch(a, { module: "store", model: "book" })).toHaveLength(1);

    const removed = await linkSvc.dismiss(a, b);
    expect(removed).toBe(1);
    expect(await linkSvc.fetch(a, { module: "store", model: "book" })).toHaveLength(0);

    await linkSvc.create(a, b); // revive
    expect(await linkSvc.fetch(a, { module: "store", model: "book" })).toHaveLength(1);
  });

  test("graph resolves nested linked records with field selection", async () => {
    const author = await blogSvc.author.create({ data: { name: "Asimov" } });
    const book = await storeSvc.book.create({ data: { title: "Foundation" } });
    await linkSvc.create(
      { module: "blog", model: "author", id: author.id },
      { module: "store", model: "book", id: book.id },
    );

    const result = await linkSvc.graph({
      module: "blog",
      entity: "author",
      fields: ["name", "books.title"],
      filters: { id: author.id },
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].name).toBe("Asimov");
    expect(result.data[0].books).toHaveLength(1);
    expect(result.data[0].books[0].title).toBe("Foundation");
  });
});
