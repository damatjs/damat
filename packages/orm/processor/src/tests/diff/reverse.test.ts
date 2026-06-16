import { describe, it, expect } from "bun:test";
import type { SchemaDiff } from "../../types/diff";
import { reverseDiff } from "../../diff/reverse";
import { diffSchemas } from "../../diff/diffSchemas";
import { PRIORITY } from "../../diff/priority";
import {
  col,
  idColumn,
  moduleSchema,
  statusEnum,
  statusEnumExtended,
  table,
} from "../__fixtures__/schemas";

function diffOf(prev = moduleSchema(), next = moduleSchema()): SchemaDiff {
  return diffSchemas(prev, next);
}

describe("reverseDiff › invertible operations", () => {
  it("inverts create_table into drop_table", () => {
    const diff = diffOf(moduleSchema(), moduleSchema({ tables: [table("t", [idColumn])] }));
    const rev = reverseDiff(diff);
    expect(rev.hasChanges).toBe(true);
    expect(rev.changes).toHaveLength(1);
    const change = rev.changes[0]!;
    expect(change.type).toBe("drop_table");
    if (change.type === "drop_table") {
      expect(change.tableName).toBe("t");
      expect(change.cascade).toBe(true);
      expect(change.priority).toBe(PRIORITY.DROP_TABLE);
    }
  });

  it("inverts add_column into drop_column", () => {
    const diff = diffOf(
      moduleSchema({ tables: [table("t", [idColumn])] }),
      moduleSchema({ tables: [table("t", [idColumn, col("email")])] }),
    );
    const change = reverseDiff(diff).changes[0]!;
    expect(change.type).toBe("drop_column");
    if (change.type === "drop_column") {
      expect(change.tableName).toBe("t");
      expect(change.columnName).toBe("email");
    }
  });

  it("inverts add_index into drop_index", () => {
    const diff = diffOf(
      moduleSchema({ tables: [table("t", [idColumn])] }),
      moduleSchema({
        tables: [
          table("t", [idColumn], {
            indexes: [{ name: "t_idx", columns: ["id"] }],
          }),
        ],
      }),
    );
    const change = reverseDiff(diff).changes[0]!;
    expect(change.type).toBe("drop_index");
    if (change.type === "drop_index") {
      expect(change.indexName).toBe("t_idx");
    }
  });

  it("inverts add_foreign_key into drop_foreign_key", () => {
    const diff = diffOf(
      moduleSchema({ tables: [table("p", [idColumn])] }),
      moduleSchema({
        tables: [
          table("p", [idColumn], {
            foreignKeys: [
              {
                name: "p_fk",
                columns: [{ name: "id", type: "text" }],
                referencedTable: "u",
                referencedColumns: ["id"],
              },
            ],
          }),
        ],
      }),
    );
    const change = reverseDiff(diff).changes[0]!;
    expect(change.type).toBe("drop_foreign_key");
    if (change.type === "drop_foreign_key") {
      expect(change.constraintName).toBe("p_fk");
    }
  });

  it("inverts create_enum into drop_enum", () => {
    const diff = diffOf(moduleSchema(), moduleSchema({ enums: [statusEnum] }));
    const change = reverseDiff(diff).changes[0]!;
    expect(change.type).toBe("drop_enum");
    if (change.type === "drop_enum") {
      expect(change.enumName).toBe("user_status");
    }
  });

  it("swaps add/remove values when inverting alter_enum", () => {
    const diff = diffOf(
      moduleSchema({ enums: [statusEnum] }),
      moduleSchema({ enums: [statusEnumExtended] }),
    );
    // Forward: addValues = ["banned"]
    const change = reverseDiff(diff).changes[0]!;
    expect(change.type).toBe("alter_enum");
    if (change.type === "alter_enum") {
      expect(change.removeValues).toEqual(["banned"]);
      expect(change.addValues).toBeUndefined();
    }
  });

  it("inverts each sub-change of an alter_column", () => {
    const diff = diffOf(
      moduleSchema({
        tables: [
          table("t", [
            col("c", {
              type: "integer",
              nullable: false,
              default: "0",
              unique: false,
            }),
          ]),
        ],
      }),
      moduleSchema({
        tables: [
          table("t", [
            col("c", {
              type: "bigint",
              nullable: true,
              default: "1",
              unique: true,
            }),
          ]),
        ],
      }),
    );
    const change = reverseDiff(diff).changes[0]!;
    expect(change.type).toBe("alter_column");
    if (change.type === "alter_column") {
      expect(change.changes.type).toEqual({ from: "bigint", to: "integer" });
      expect(change.changes.nullable).toEqual({ from: true, to: false });
      expect(change.changes.default).toEqual({ from: "1", to: "0" });
      expect(change.changes.unique).toEqual({ from: true, to: false });
    }
  });
});

describe("reverseDiff › non-invertible operations", () => {
  it("skips drop_table (cannot reconstruct without the original definition)", () => {
    const diff = diffOf(
      moduleSchema({ tables: [table("t", [idColumn])] }),
      moduleSchema(),
    );
    const rev = reverseDiff(diff);
    expect(rev.hasChanges).toBe(false);
    expect(rev.changes).toHaveLength(0);
  });

  it("skips drop_column, drop_index, drop_foreign_key, drop_enum", () => {
    const prev = moduleSchema({
      enums: [statusEnum],
      tables: [
        table("t", [idColumn, col("gone")], {
          indexes: [{ name: "i", columns: ["id"] }],
          foreignKeys: [
            {
              name: "fk",
              columns: [{ name: "id", type: "text" }],
              referencedTable: "u",
              referencedColumns: ["id"],
            },
          ],
        }),
      ],
    });
    const next = moduleSchema({ tables: [table("t", [idColumn])] });
    const diff = diffOf(prev, next);
    // forward has drop_* operations
    expect(diff.changes.some((c) => c.type.startsWith("drop_"))).toBe(true);
    const rev = reverseDiff(diff);
    expect(rev.changes).toHaveLength(0);
  });

  it("returns empty warnings on the reversed diff", () => {
    const diff = diffOf(moduleSchema(), moduleSchema({ enums: [statusEnum] }));
    expect(reverseDiff(diff).warnings).toEqual([]);
  });
});

describe("reverseDiff › ordering", () => {
  it("reverses change order so drops happen in inverse sequence", () => {
    // Forward create order: enum (10), table (20). Reversed list is .reverse()'d.
    const diff = diffOf(
      moduleSchema(),
      moduleSchema({
        enums: [statusEnum],
        tables: [table("t", [idColumn])],
      }),
    );
    const rev = reverseDiff(diff);
    // Forward produced [create_enum, create_table] -> inverses
    // [drop_enum, drop_table] then .reverse() => [drop_table, drop_enum]
    expect(rev.changes.map((c) => c.type)).toEqual(["drop_table", "drop_enum"]);
  });
});
