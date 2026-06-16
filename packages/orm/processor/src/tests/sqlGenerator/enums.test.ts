import { describe, it, expect } from "bun:test";
import {
  generateAlterEnum,
  generateCreateEnum,
  generateDropEnum,
} from "../../sqlGenerator/enums";

const opts = { schema: "public", safeMode: true, cascadeDrops: false };

describe("generateCreateEnum", () => {
  it("wraps CREATE TYPE in a DO block guard under safeMode", () => {
    const sql = generateCreateEnum(
      {
        type: "create_enum",
        enumDef: { name: "user_status", values: ["active", "inactive"] },
        priority: 10,
      },
      opts,
    );
    expect(sql).toContain("DO $$ BEGIN");
    expect(sql).toContain(
      "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status')",
    );
    expect(sql).toContain(
      `CREATE TYPE "public"."user_status" AS ENUM ('active', 'inactive');`,
    );
    expect(sql).toContain("END $$");
  });

  it("emits a bare CREATE TYPE when safeMode is false", () => {
    const sql = generateCreateEnum(
      {
        type: "create_enum",
        enumDef: { name: "e", values: ["a", "b"] },
        priority: 10,
      },
      { ...opts, safeMode: false },
    );
    expect(sql).toBe(`CREATE TYPE "public"."e" AS ENUM ('a', 'b')`);
  });

  it("escapes single quotes inside enum values", () => {
    const sql = generateCreateEnum(
      {
        type: "create_enum",
        enumDef: { name: "e", values: ["o'brien"] },
        priority: 10,
      },
      { ...opts, safeMode: false },
    );
    expect(sql).toContain(`'o''brien'`);
  });

  it("prefers the enum's own schema over the option schema", () => {
    const sql = generateCreateEnum(
      {
        type: "create_enum",
        enumDef: { name: "e", schema: "store", values: ["a"] },
        priority: 10,
      },
      { ...opts, safeMode: false },
    );
    expect(sql).toContain('"store"."e"');
  });
});

describe("generateDropEnum", () => {
  it("emits DROP TYPE IF EXISTS", () => {
    const sql = generateDropEnum(
      { type: "drop_enum", enumName: "user_status", priority: 140 },
      opts,
    );
    expect(sql).toBe('DROP TYPE IF EXISTS "public"."user_status"');
  });

  it("adds CASCADE when cascadeDrops is set", () => {
    const sql = generateDropEnum(
      { type: "drop_enum", enumName: "e", priority: 140 },
      { ...opts, cascadeDrops: true },
    );
    expect(sql).toBe('DROP TYPE IF EXISTS "public"."e" CASCADE');
  });

  it("omits IF EXISTS when safeMode is false", () => {
    const sql = generateDropEnum(
      { type: "drop_enum", enumName: "e", priority: 140 },
      { ...opts, safeMode: false },
    );
    expect(sql).toBe('DROP TYPE "public"."e"');
  });
});

describe("generateAlterEnum", () => {
  it("emits one ADD VALUE IF NOT EXISTS per added value", () => {
    const sql = generateAlterEnum(
      {
        type: "alter_enum",
        enumName: "user_status",
        addValues: ["banned", "pending"],
        priority: 60,
      },
      opts,
    );
    expect(sql).toEqual([
      `ALTER TYPE "public"."user_status" ADD VALUE IF NOT EXISTS 'banned'`,
      `ALTER TYPE "public"."user_status" ADD VALUE IF NOT EXISTS 'pending'`,
    ]);
  });

  it("emits an instructional comment (not DDL) for removed values", () => {
    const sql = generateAlterEnum(
      {
        type: "alter_enum",
        enumName: "user_status",
        removeValues: ["legacy"],
        priority: 60,
      },
      opts,
    );
    expect(sql).toHaveLength(1);
    expect(sql[0]).toContain("-- Removing enum values requires recreating");
    expect(sql[0]).toContain("legacy");
  });

  it("emits adds first, then the removal comment", () => {
    const sql = generateAlterEnum(
      {
        type: "alter_enum",
        enumName: "e",
        addValues: ["new"],
        removeValues: ["old"],
        priority: 60,
      },
      opts,
    );
    expect(sql).toHaveLength(2);
    expect(sql[0]).toContain("ADD VALUE");
    expect(sql[1]).toContain("-- Removing");
  });

  it("returns an empty array when nothing to add or remove", () => {
    const sql = generateAlterEnum(
      { type: "alter_enum", enumName: "e", priority: 60 },
      opts,
    );
    expect(sql).toEqual([]);
  });
});
