import { describe, it, expect } from "bun:test";
import { PgRepository, createRepository } from "../../src/repository";
import { FakeConn, UserModel, noopLogger } from "../helpers/fixtures";

function makeRepo(opts: ConstructorParameters<typeof FakeConn>[0] = {}) {
  const conn = new FakeConn(opts);
  const repo = createRepository(UserModel, conn as any, noopLogger);
  return { repo, conn };
}

describe("createRepository", () => {
  it("constructs a PgRepository bound to the given connection", () => {
    const { repo } = makeRepo();
    expect(repo).toBeInstanceOf(PgRepository);
  });

  it("unwraps a { getPool } provider and marks it not-in-transaction", () => {
    const conn = new FakeConn();
    const provider = { getPool: () => conn as any };
    const repo = createRepository(UserModel, provider as any, noopLogger, true);
    // @ts-expect-error access protected for assertion
    expect(repo.isInTransaction).toBe(false);
    // @ts-expect-error access protected for assertion
    expect(repo.connection).toBe(conn);
  });
});

describe("PgRepository — read methods", () => {
  it("findMany returns the full result object", async () => {
    const { repo, conn } = makeRepo({ rows: [{ id: "u1" }] });
    const res: any = await repo.findMany({ where: { verified: true } });
    expect(res.rows).toEqual([{ id: "u1" }]);
    expect(conn.last.sql).toContain('WHERE "verified" = $1');
  });

  it("findOne returns the first row only", async () => {
    const { repo, conn } = makeRepo({ rows: [{ id: "u1" }, { id: "u2" }] });
    const row = await repo.findOne({ where: { id: "u1" } });
    expect(row).toEqual({ id: "u1" });
    expect(conn.last.sql).toContain("LIMIT 1");
  });

  it("findOne returns undefined when there are no rows", async () => {
    const { repo } = makeRepo({ rows: [] });
    expect(await repo.findOne({ where: { id: "x" } })).toBeUndefined();
  });

  it("findById builds a where on id", async () => {
    const { repo, conn } = makeRepo({ rows: [{ id: "u1" }] });
    const row = await repo.findById("u1");
    expect(conn.last.sql).toBe(
      'SELECT * FROM "app"."user" WHERE "id" = $1 LIMIT 1',
    );
    expect(conn.last.params).toEqual(["u1"]);
    expect(row).toEqual({ id: "u1" });
  });

  it("findManyByIds builds an IN(...) where", async () => {
    const { repo, conn } = makeRepo({ rows: [{ id: "u1" }, { id: "u2" }] });
    await repo.findManyByIds(["u1", "u2"]);
    expect(conn.last.sql).toBe(
      'SELECT * FROM "app"."user" WHERE "id" IN ($1, $2)',
    );
    expect(conn.last.params).toEqual(["u1", "u2"]);
  });
});

describe("PgRepository — write methods", () => {
  it("create returns the inserted row", async () => {
    const { repo } = makeRepo({ rows: [{ id: "u1", email: "a@b.com" }] });
    const row = await repo.create({ data: { id: "u1", email: "a@b.com" } });
    expect(row).toEqual({ id: "u1", email: "a@b.com" });
  });

  it("create throws when no row is returned", async () => {
    const { repo } = makeRepo({ rows: [] });
    await expect(
      repo.create({ data: { id: "u1", email: "a@b.com" } }),
    ).rejects.toThrow(/no rows returned/);
  });

  it("createMany returns all inserted rows", async () => {
    const { repo } = makeRepo({ rows: [{ id: "u1" }, { id: "u2" }] });
    const rows = await repo.createMany({ data: [{ id: "u1" }, { id: "u2" }] });
    expect(rows).toHaveLength(2);
  });

  it("update returns updated rows", async () => {
    const { repo, conn } = makeRepo({ rows: [{ id: "u1", verified: true }] });
    const rows = await repo.update({
      set: { verified: true },
      where: { id: "u1" },
    });
    expect(rows).toEqual([{ id: "u1", verified: true }]);
    expect(conn.last.sql).toContain("UPDATE");
  });

  it("updateOne returns the first updated row", async () => {
    const { repo, conn } = makeRepo({ rows: [{ id: "u1" }] });
    const row = await repo.updateOne({ verified: true }, { id: "u1" }, ["id"]);
    expect(row).toEqual({ id: "u1" });
    expect(conn.last.sql).toBe(
      'UPDATE "app"."user" SET "verified" = $1 WHERE "id" = $2 RETURNING "id"',
    );
  });

  it("delete returns the affected rowCount", async () => {
    const { repo } = makeRepo({ rows: [], rowCount: 4 });
    const count = await repo.delete({ where: { verified: false } });
    expect(count).toBe(4);
  });

  it("deleteById builds a where on id and returns the deleted row", async () => {
    const { repo, conn } = makeRepo({ rows: [{ id: "u1" }] });
    const row = await repo.deleteById("u1");
    expect(conn.last.sql).toBe(
      'DELETE FROM "app"."user" WHERE "id" = $1 RETURNING *',
    );
    expect(row).toEqual({ id: "u1" });
  });

  it("upsert returns the upserted row", async () => {
    const { repo } = makeRepo({ rows: [{ id: "u1" }] });
    const row = await repo.upsert({
      data: { id: "u1", email: "a@b.com", name: "Alice" },
      onConflict: ["email"],
    });
    expect(row).toEqual({ id: "u1" });
  });

  it("upsert throws when no row is returned", async () => {
    const { repo } = makeRepo({ rows: [] });
    await expect(
      repo.upsert({
        data: { id: "u1", email: "a@b.com", name: "Alice" },
        onConflict: ["email"],
      }),
    ).rejects.toThrow(/Upsert failed/);
  });
});

describe("PgRepository — aggregate helpers", () => {
  it("count wraps the select in a COUNT(*) subquery and parses the result", async () => {
    const { repo, conn } = makeRepo({ rows: [{ count: "12" }] });
    const n = await repo.count({ verified: true });
    expect(conn.last.sql).toContain("SELECT COUNT(*) FROM (");
    expect(conn.last.sql).toContain('WHERE "verified" = $1');
    expect(conn.last.params).toEqual([true]);
    expect(n).toBe(12);
  });

  it("count returns 0 when no row comes back", async () => {
    const { repo } = makeRepo({ rows: [] });
    expect(await repo.count()).toBe(0);
  });

  it("exists wraps the findOne select in SELECT EXISTS(...)", async () => {
    const { repo, conn } = makeRepo({ rows: [{ exists: true }] });
    const ok = await repo.exists({ id: "u1" });
    expect(conn.last.sql).toContain("SELECT EXISTS(");
    expect(conn.last.sql).toContain("LIMIT 1");
    expect(ok).toBe(true);
  });

  it("exists defaults to false when no row comes back", async () => {
    const { repo } = makeRepo({ rows: [] });
    expect(await repo.exists({ id: "x" })).toBe(false);
  });
});

describe("PgRepository.getAccessor", () => {
  it("exposes the underlying ModelAccessor", () => {
    const { repo } = makeRepo();
    const accessor = repo.getAccessor();
    expect(typeof accessor.findMany).toBe("function");
    expect((accessor as any)._model._tableName).toBe("user");
  });
});
