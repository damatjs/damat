import { describe, it, expect } from "bun:test";
import type { ForeignKeySchema } from "@damatjs/orm-type";
import {
  generateAddForeignKey,
  generateAddForeignKeyFromChange,
  generateDropForeignKey,
} from "../../sqlGenerator/foreignKeys";

const opts = { schema: "public", safeMode: true, cascadeDrops: false };

function fk(overrides: Partial<ForeignKeySchema> = {}): ForeignKeySchema {
  return {
    name: "post_user_fk",
    columns: [{ name: "user_id", type: "text" }],
    referencedTable: "user",
    referencedColumns: ["id"],
    ...overrides,
  };
}

describe("generateAddForeignKey", () => {
  it("emits the base ADD CONSTRAINT ... FOREIGN KEY ... REFERENCES clause", () => {
    expect(generateAddForeignKey(fk(), "post", "public")).toBe(
      'ALTER TABLE "public"."post" ADD CONSTRAINT "post_user_fk" FOREIGN KEY ("user_id") REFERENCES "user" ("id")',
    );
  });

  it("appends ON DELETE and ON UPDATE actions", () => {
    const sql = generateAddForeignKey(
      fk({ onDelete: "CASCADE", onUpdate: "RESTRICT" }),
      "post",
      "public",
    );
    expect(sql).toContain("ON DELETE CASCADE");
    expect(sql).toContain("ON UPDATE RESTRICT");
  });

  it("appends DEFERRABLE INITIALLY DEFERRED", () => {
    const sql = generateAddForeignKey(
      fk({ deferrable: true, initiallyDeferred: true }),
      "post",
      "public",
    );
    expect(sql).toContain("DEFERRABLE INITIALLY DEFERRED");
  });

  it("appends only DEFERRABLE when not initially deferred", () => {
    const sql = generateAddForeignKey(
      fk({ deferrable: true, initiallyDeferred: false }),
      "post",
      "public",
    );
    expect(sql).toContain("DEFERRABLE");
    expect(sql).not.toContain("INITIALLY DEFERRED");
  });

  it("appends MATCH FULL only for FULL match", () => {
    expect(generateAddForeignKey(fk({ match: "FULL" }), "post", "public")).toContain(
      "MATCH FULL",
    );
    expect(
      generateAddForeignKey(fk({ match: "SIMPLE" }), "post", "public"),
    ).not.toContain("MATCH");
  });

  it("renders multi-column composite foreign keys", () => {
    const sql = generateAddForeignKey(
      fk({
        columns: [
          { name: "a", type: "text" },
          { name: "b", type: "text" },
        ],
        referencedColumns: ["x", "y"],
      }),
      "t",
      "public",
    );
    expect(sql).toContain('FOREIGN KEY ("a", "b")');
    expect(sql).toContain('REFERENCES "user" ("x", "y")');
  });
});

describe("generateAddForeignKeyFromChange", () => {
  it("resolves schema from options and delegates to generateAddForeignKey", () => {
    const sql = generateAddForeignKeyFromChange(
      {
        type: "add_foreign_key",
        tableName: "post",
        foreignKey: fk(),
        priority: 50,
      },
      { ...opts, schema: "store" },
    );
    expect(sql).toContain('ALTER TABLE "store"."post"');
    expect(sql).toContain('ADD CONSTRAINT "post_user_fk"');
  });
});

describe("generateDropForeignKey", () => {
  it("emits DROP CONSTRAINT IF EXISTS", () => {
    const sql = generateDropForeignKey(
      {
        type: "drop_foreign_key",
        tableName: "post",
        constraintName: "post_user_fk",
        priority: 100,
      },
      opts,
    );
    expect(sql).toBe(
      'ALTER TABLE "public"."post" DROP CONSTRAINT IF EXISTS "post_user_fk"',
    );
  });

  it("omits IF EXISTS when safeMode is false", () => {
    const sql = generateDropForeignKey(
      {
        type: "drop_foreign_key",
        tableName: "post",
        constraintName: "fk",
        priority: 100,
      },
      { ...opts, safeMode: false },
    );
    expect(sql).toBe('ALTER TABLE "public"."post" DROP CONSTRAINT "fk"');
  });
});
