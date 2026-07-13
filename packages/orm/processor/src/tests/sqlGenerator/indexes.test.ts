import { describe, it, expect } from "bun:test";
import type { IndexSchema } from "@damatjs/orm-type";
import {
  generateAddIndex,
  generateCreateIndex,
  generateDropIndex,
} from "../../sqlGenerator/indexes";

const opts = { schema: "public", safeMode: true, cascadeDrops: false };

describe("generateCreateIndex", () => {
  it("emits CREATE INDEX IF NOT EXISTS with quoted name and columns", () => {
    const idx: IndexSchema = { name: "user_email_idx", columns: ["email"] };
    expect(generateCreateIndex(idx, "user", "public", opts)).toBe(
      'CREATE INDEX IF NOT EXISTS "user_email_idx" ON "public"."user" ("email")',
    );
  });

  it("emits CREATE UNIQUE INDEX for a unique index", () => {
    const idx: IndexSchema = {
      name: "user_email_idx",
      columns: ["email"],
      unique: true,
    };
    expect(generateCreateIndex(idx, "user", "public", opts)).toContain(
      "CREATE UNIQUE INDEX IF NOT EXISTS",
    );
  });

  it("derives the index name from columns when unnamed", () => {
    const idx: IndexSchema = { columns: ["a", "b"] };
    expect(generateCreateIndex(idx, "t", "public", opts)).toContain(
      '"t_a_b_idx"',
    );
  });

  it("renders column sort order", () => {
    const idx: IndexSchema = {
      name: "i",
      columns: [{ name: "a", order: "DESC" }, "b"],
    };
    expect(generateCreateIndex(idx, "t", "public", opts)).toContain(
      '("a" DESC, "b")',
    );
  });

  it("emits USING <method> for a non-btree index type", () => {
    const idx: IndexSchema = { name: "i", columns: ["tags"], type: "gin" };
    const sql = generateCreateIndex(idx, "t", "public", opts);
    expect(sql).toContain("USING GIN");
  });

  it("omits USING for a btree index (default)", () => {
    const idx: IndexSchema = { name: "i", columns: ["a"], type: "btree" };
    expect(generateCreateIndex(idx, "t", "public", opts)).not.toContain(
      "USING",
    );
  });

  it("appends a partial WHERE clause", () => {
    const idx: IndexSchema = {
      name: "i",
      columns: ["a"],
      where: "a IS NOT NULL",
    };
    expect(generateCreateIndex(idx, "t", "public", opts)).toContain(
      "WHERE a IS NOT NULL",
    );
  });

  it("omits IF NOT EXISTS when safeMode is false", () => {
    const idx: IndexSchema = { name: "i", columns: ["a"] };
    const sql = generateCreateIndex(idx, "t", "public", {
      ...opts,
      safeMode: false,
    });
    expect(sql).toContain('CREATE INDEX "i"');
    expect(sql).not.toContain("IF NOT EXISTS");
  });

  it("combines unique + gin + where in the correct order", () => {
    const idx: IndexSchema = {
      name: "i",
      columns: ["a"],
      unique: true,
      type: "gin",
      where: "a > 0",
    };
    const sql = generateCreateIndex(idx, "t", "public", {
      ...opts,
      safeMode: false,
    });
    expect(sql).toBe(
      'CREATE UNIQUE INDEX "i" ON "public"."t" USING GIN ("a") WHERE a > 0',
    );
  });
});

describe("generateAddIndex", () => {
  it("resolves schema from options", () => {
    const sql = generateAddIndex(
      {
        type: "add_index",
        tableName: "t",
        index: { name: "i", columns: ["a"] },
        priority: 40,
      },
      { ...opts, schema: "store" },
    );
    expect(sql).toContain('ON "store"."t"');
  });
});

describe("generateDropIndex", () => {
  it("emits DROP INDEX IF EXISTS, schema-qualifying the index name", () => {
    const sql = generateDropIndex(
      {
        type: "drop_index",
        tableName: "t",
        indexName: "user_email_idx",
        priority: 110,
      },
      opts,
    );
    expect(sql).toBe('DROP INDEX IF EXISTS "public"."user_email_idx"');
  });

  it("omits IF EXISTS when safeMode is false", () => {
    const sql = generateDropIndex(
      { type: "drop_index", tableName: "t", indexName: "i", priority: 110 },
      { ...opts, safeMode: false },
    );
    expect(sql).toBe('DROP INDEX "public"."i"');
  });
});
