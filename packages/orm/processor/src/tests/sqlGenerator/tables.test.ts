import { describe, it, expect } from "bun:test";
import type { CreateTableChange } from "../../types/diff";
import {
  generateCreateTable,
  generateDropTable,
  generateRenameTable,
  generateTableSql,
} from "../../sqlGenerator/tables";
import { col, idColumn } from "../__fixtures__/schemas";

const opts = { schema: "public", safeMode: true, cascadeDrops: false };

function createChange(table: CreateTableChange["table"]): CreateTableChange {
  return { type: "create_table", tableName: table.name, table, priority: 20 };
}

describe("generateCreateTable", () => {
  it("emits CREATE TABLE IF NOT EXISTS with quoted, qualified name", () => {
    const change = createChange({
      name: "user",
      columns: [idColumn, col("email")],
    });
    const { tableStatements } = generateCreateTable(change, opts);
    expect(tableStatements).toHaveLength(1);
    const sql = tableStatements[0]!;
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS "public"."user"');
    expect(sql).toContain('"id" TEXT PRIMARY KEY');
    expect(sql).toContain(`"email" TEXT NOT NULL`);
  });

  it("omits IF NOT EXISTS when safeMode is false", () => {
    const change = createChange({ name: "t", columns: [idColumn] });
    const sql = generateCreateTable(change, { ...opts, safeMode: false })
      .tableStatements[0]!;
    expect(sql).toContain('CREATE TABLE "public"."t"');
    expect(sql).not.toContain("IF NOT EXISTS");
  });

  it("uses the configured schema", () => {
    const change = createChange({ name: "t", columns: [idColumn] });
    const sql = generateCreateTable(change, { ...opts, schema: "store" })
      .tableStatements[0]!;
    expect(sql).toContain('"store"."t"');
  });

  it("emits a composite PRIMARY KEY constraint for multiple PK columns", () => {
    const change = createChange({
      name: "order_item",
      columns: [
        { name: "order_id", type: "text", primaryKey: true, nullable: false },
        { name: "product_id", type: "text", primaryKey: true, nullable: false },
      ],
    });
    const sql = generateCreateTable(change, opts).tableStatements[0]!;
    // Composite PK columns must NOT carry inline PRIMARY KEY; they become NOT NULL
    expect(sql).toContain('"order_id" TEXT NOT NULL');
    expect(sql).toContain('"product_id" TEXT NOT NULL');
    expect(sql).toContain(
      'CONSTRAINT "order_item_pkey" PRIMARY KEY ("order_id", "product_id")',
    );
  });

  it("never returns inline foreign key statements (deferred to separate changes)", () => {
    const change = createChange({ name: "t", columns: [idColumn] });
    const { foreignKeyStatements } = generateCreateTable(change, opts);
    expect(foreignKeyStatements).toEqual([]);
  });

  it("generateTableSql is equivalent to generateCreateTable", () => {
    const table = { name: "t", columns: [idColumn] };
    const direct = generateTableSql(table, opts);
    const viaChange = generateCreateTable(createChange(table), opts);
    expect(direct.tableStatements).toEqual(viaChange.tableStatements);
  });
});

describe("generateDropTable", () => {
  it("emits DROP TABLE IF EXISTS ... CASCADE when cascade flag is set on the change", () => {
    const sql = generateDropTable(
      { type: "drop_table", tableName: "user", cascade: true, priority: 130 },
      opts,
    );
    expect(sql).toBe('DROP TABLE IF EXISTS "public"."user" CASCADE');
  });

  it("omits CASCADE when neither change.cascade nor cascadeDrops set", () => {
    const sql = generateDropTable(
      { type: "drop_table", tableName: "user", cascade: false, priority: 130 },
      opts,
    );
    expect(sql).toBe('DROP TABLE IF EXISTS "public"."user"');
  });

  it("adds CASCADE from the global cascadeDrops option", () => {
    const sql = generateDropTable(
      { type: "drop_table", tableName: "user", cascade: false, priority: 130 },
      { ...opts, cascadeDrops: true },
    );
    expect(sql).toContain(" CASCADE");
  });

  it("omits IF EXISTS when safeMode is false", () => {
    const sql = generateDropTable(
      { type: "drop_table", tableName: "user", cascade: false, priority: 130 },
      { ...opts, safeMode: false },
    );
    expect(sql).toBe('DROP TABLE "public"."user"');
  });
});

describe("generateRenameTable", () => {
  it("emits ALTER TABLE ... RENAME TO with the new (unqualified) name", () => {
    const sql = generateRenameTable(
      { type: "rename_table", fromName: "old", toName: "new", priority: 80 },
      opts,
    );
    expect(sql).toBe('ALTER TABLE "public"."old" RENAME TO "new"');
  });
});
