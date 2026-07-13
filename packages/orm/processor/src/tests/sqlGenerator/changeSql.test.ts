import { describe, it, expect } from "bun:test";
import type { SchemaChange, SchemaDiff } from "../../types/diff";
import {
  generateChangeSQL,
  generateDescription,
} from "../../sqlGenerator/changeSql";
import { idColumn } from "../__fixtures__/schemas";

const opts = { schema: "public", safeMode: true, cascadeDrops: false };

describe("generateChangeSQL dispatch", () => {
  it("dispatches create_table to table statements (FKs/indexes excluded)", () => {
    const change: SchemaChange = {
      type: "create_table",
      tableName: "t",
      table: { name: "t", columns: [idColumn] },
      priority: 20,
    };
    const sql = generateChangeSQL(change, opts);
    expect(sql).toHaveLength(1);
    expect(sql[0]).toContain("CREATE TABLE");
  });

  it("dispatches alter_column to potentially multiple statements", () => {
    const change: SchemaChange = {
      type: "alter_column",
      tableName: "t",
      columnName: "c",
      changes: {
        type: { from: "integer", to: "bigint" },
        nullable: { from: true, to: false },
      },
      priority: 70,
    };
    const sql = generateChangeSQL(change, opts);
    expect(sql).toHaveLength(2);
  });

  it("dispatches add_column to a single ADD COLUMN statement", () => {
    const change: SchemaChange = {
      type: "add_column",
      tableName: "t",
      column: { name: "email", type: "text", nullable: false },
      priority: 30,
    };
    const sql = generateChangeSQL(change, opts);
    expect(sql).toHaveLength(1);
    expect(sql[0]).toContain("ADD COLUMN");
  });

  it("dispatches rename_column to a single RENAME COLUMN statement", () => {
    const change: SchemaChange = {
      type: "rename_column",
      tableName: "t",
      fromName: "old_name",
      toName: "new_name",
      priority: 90,
    };
    const sql = generateChangeSQL(change, opts);
    expect(sql).toHaveLength(1);
    expect(sql[0]).toContain("RENAME COLUMN");
  });

  it("dispatches alter_enum to ADD VALUE statements", () => {
    const change: SchemaChange = {
      type: "alter_enum",
      enumName: "e",
      addValues: ["x"],
      priority: 60,
    };
    const sql = generateChangeSQL(change, opts);
    expect(sql[0]).toContain("ADD VALUE");
  });

  it.each([
    [
      "drop_table",
      { type: "drop_table", tableName: "t", cascade: false, priority: 130 },
      "DROP TABLE",
    ],
    [
      "rename_table",
      { type: "rename_table", fromName: "a", toName: "b", priority: 80 },
      "RENAME TO",
    ],
    [
      "drop_column",
      { type: "drop_column", tableName: "t", columnName: "c", priority: 120 },
      "DROP COLUMN",
    ],
    [
      "drop_index",
      { type: "drop_index", tableName: "t", indexName: "i", priority: 110 },
      "DROP INDEX",
    ],
    [
      "drop_foreign_key",
      {
        type: "drop_foreign_key",
        tableName: "t",
        constraintName: "fk",
        priority: 100,
      },
      "DROP CONSTRAINT",
    ],
    [
      "drop_enum",
      { type: "drop_enum", enumName: "e", priority: 140 },
      "DROP TYPE",
    ],
  ])("dispatches %s to a single statement", (_label, change, fragment) => {
    const sql = generateChangeSQL(change as SchemaChange, opts);
    expect(sql).toHaveLength(1);
    expect(sql[0]).toContain(fragment as string);
  });
});

describe("generateDescription", () => {
  function diffOf(changes: SchemaChange[]): SchemaDiff {
    return { hasChanges: changes.length > 0, changes, warnings: [] };
  }

  it("returns 'No changes' for an empty diff", () => {
    expect(generateDescription(diffOf([]))).toBe("No changes");
  });

  it("uses the singular form for a single change", () => {
    const desc = generateDescription(
      diffOf([
        {
          type: "create_table",
          tableName: "t",
          table: { name: "t", columns: [] },
          priority: 20,
        },
      ]),
    );
    expect(desc).toBe("1 table created");
  });

  it("uses the plural form and joins multiple categories", () => {
    const desc = generateDescription(
      diffOf([
        {
          type: "create_table",
          tableName: "a",
          table: { name: "a", columns: [] },
          priority: 20,
        },
        {
          type: "create_table",
          tableName: "b",
          table: { name: "b", columns: [] },
          priority: 20,
        },
        { type: "add_column", tableName: "a", column: idColumn, priority: 30 },
      ]),
    );
    expect(desc).toBe("2 tables created, 1 column added");
  });

  it("orders the summary by the fixed category list, not insertion order", () => {
    const desc = generateDescription(
      diffOf([
        // inserted drop first, create_enum second...
        { type: "drop_table", tableName: "x", cascade: false, priority: 130 },
        {
          type: "create_enum",
          enumName: "e",
          enumDef: { name: "e", values: [] },
          priority: 10,
        } as SchemaChange,
      ]),
    );
    // ...but the summary follows generateDescription's hardcoded part order,
    // where drop_table (early) precedes create_enum (late).
    expect(desc).toBe("1 table dropped, 1 enum created");
    expect(desc.indexOf("table dropped")).toBeLessThan(
      desc.indexOf("enum created"),
    );
  });
});
