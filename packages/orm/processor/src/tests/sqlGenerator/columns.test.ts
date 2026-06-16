import { describe, it, expect } from "bun:test";
import type { AlterColumnChange } from "../../types/diff";
import {
  generateAddColumn,
  generateAlterColumn,
  generateDropColumn,
  generateRenameColumn,
} from "../../sqlGenerator/columns";
import { col } from "../__fixtures__/schemas";

const opts = { schema: "public", safeMode: true, cascadeDrops: false };

describe("generateAddColumn", () => {
  it("emits ALTER TABLE ... ADD COLUMN with the full column definition", () => {
    const sql = generateAddColumn(
      {
        type: "add_column",
        tableName: "user",
        column: col("email", { type: "text", nullable: true }),
        priority: 30,
      },
      opts,
    );
    expect(sql).toBe(
      'ALTER TABLE "public"."user" ADD COLUMN "email" TEXT NULL',
    );
  });
});

describe("generateDropColumn", () => {
  it("emits DROP COLUMN IF EXISTS", () => {
    const sql = generateDropColumn(
      { type: "drop_column", tableName: "user", columnName: "email", priority: 120 },
      opts,
    );
    expect(sql).toBe('ALTER TABLE "public"."user" DROP COLUMN IF EXISTS "email"');
  });

  it("adds CASCADE when cascadeDrops is set", () => {
    const sql = generateDropColumn(
      { type: "drop_column", tableName: "user", columnName: "email", priority: 120 },
      { ...opts, cascadeDrops: true },
    );
    expect(sql).toBe(
      'ALTER TABLE "public"."user" DROP COLUMN IF EXISTS "email" CASCADE',
    );
  });

  it("omits IF EXISTS when safeMode is false", () => {
    const sql = generateDropColumn(
      { type: "drop_column", tableName: "user", columnName: "email", priority: 120 },
      { ...opts, safeMode: false },
    );
    expect(sql).toBe('ALTER TABLE "public"."user" DROP COLUMN "email"');
  });
});

describe("generateRenameColumn", () => {
  it("emits ALTER TABLE ... RENAME COLUMN", () => {
    const sql = generateRenameColumn(
      {
        type: "rename_column",
        tableName: "user",
        fromName: "old",
        toName: "new",
        priority: 75,
      },
      opts,
    );
    expect(sql).toBe(
      'ALTER TABLE "public"."user" RENAME COLUMN "old" TO "new"',
    );
  });
});

function alter(changes: AlterColumnChange["changes"]): AlterColumnChange {
  return {
    type: "alter_column",
    tableName: "user",
    columnName: "age",
    changes,
    priority: 70,
  };
}

describe("generateAlterColumn", () => {
  it("emits a TYPE change with a USING cast", () => {
    const sql = generateAlterColumn(
      alter({ type: { from: "integer", to: "bigint" } }),
      opts,
    );
    expect(sql).toEqual([
      'ALTER TABLE "public"."user" ALTER COLUMN "age" TYPE BIGINT USING "age"::BIGINT',
    ]);
  });

  it("emits SET NOT NULL when becoming non-nullable", () => {
    const sql = generateAlterColumn(
      alter({ nullable: { from: true, to: false } }),
      opts,
    );
    expect(sql).toEqual([
      'ALTER TABLE "public"."user" ALTER COLUMN "age" SET NOT NULL',
    ]);
  });

  it("emits DROP NOT NULL when becoming nullable", () => {
    const sql = generateAlterColumn(
      alter({ nullable: { from: false, to: true } }),
      opts,
    );
    expect(sql).toEqual([
      'ALTER TABLE "public"."user" ALTER COLUMN "age" DROP NOT NULL',
    ]);
  });

  it("emits SET DEFAULT when a default is added/changed", () => {
    const sql = generateAlterColumn(
      alter({ default: { from: undefined, to: "0" } }),
      opts,
    );
    expect(sql).toEqual([
      'ALTER TABLE "public"."user" ALTER COLUMN "age" SET DEFAULT 0',
    ]);
  });

  it("emits DROP DEFAULT when a default is removed", () => {
    const sql = generateAlterColumn(
      alter({ default: { from: "0", to: undefined } }),
      opts,
    );
    expect(sql).toEqual([
      'ALTER TABLE "public"."user" ALTER COLUMN "age" DROP DEFAULT',
    ]);
  });

  it("emits a VARCHAR length change when only length changes (no type swap)", () => {
    const sql = generateAlterColumn(
      alter({ length: { from: 64, to: 128 } }),
      opts,
    );
    expect(sql).toEqual([
      'ALTER TABLE "public"."user" ALTER COLUMN "age" TYPE VARCHAR(128)',
    ]);
  });

  it("does NOT emit a standalone VARCHAR statement when a type change is present", () => {
    const sql = generateAlterColumn(
      alter({
        type: { from: "character varying", to: "text" },
        length: { from: 64, to: undefined },
      }),
      opts,
    );
    expect(sql).toHaveLength(1);
    expect(sql[0]).toContain("TYPE TEXT");
  });

  it("emits ADD UNIQUE when unique turns on", () => {
    const sql = generateAlterColumn(
      alter({ unique: { from: false, to: true } }),
      opts,
    );
    expect(sql).toEqual(['ALTER TABLE "public"."user" ADD UNIQUE ("age")']);
  });

  it("emits a placeholder comment when unique turns off (constraint name unknown)", () => {
    const sql = generateAlterColumn(
      alter({ unique: { from: true, to: false } }),
      opts,
    );
    expect(sql).toHaveLength(1);
    expect(sql[0]).toContain("-- ALTER TABLE");
    expect(sql[0]).toContain("DROP CONSTRAINT");
    expect(sql[0]).toContain("age");
  });

  it("emits multiple statements in order: type, nullable, default", () => {
    const sql = generateAlterColumn(
      alter({
        type: { from: "integer", to: "bigint" },
        nullable: { from: true, to: false },
        default: { from: undefined, to: "1" },
      }),
      opts,
    );
    expect(sql).toHaveLength(3);
    expect(sql[0]).toContain("TYPE BIGINT");
    expect(sql[1]).toContain("SET NOT NULL");
    expect(sql[2]).toContain("SET DEFAULT 1");
  });
});
