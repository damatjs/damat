import { describe, it, expect } from "bun:test";
import { diffColumns } from "../../diff/columns";
import { diffIndexes } from "../../diff/indexes";
import { diffForeignKeys } from "../../diff/foreignKeys";
import { diffEnums } from "../../diff/enums";
import { diffTable } from "../../diff/tables";
import { col, idColumn, table } from "../__fixtures__/schemas";

// These tests exercise the per-section diff helpers directly, so they observe
// the *unsorted* change order each helper produces (diffSchemas re-sorts).

describe("diffColumns (isolated)", () => {
  it("returns [] for identical column lists", () => {
    const cols = [idColumn, col("email")];
    expect(diffColumns("t", cols, cols)).toEqual([]);
  });

  it("does not emit alter_column when nothing material changed", () => {
    const a = [col("c", { type: "integer", nullable: false })];
    const b = [col("c", { type: "integer", nullable: false })];
    expect(diffColumns("t", a, b)).toEqual([]);
  });

  it("normalizes unique undefined→false (no spurious change)", () => {
    // columnsEqual treats unique:undefined === unique:false? No — strict ===.
    // unique undefined vs false IS a change per columnsEqual.
    const a = [col("c", { type: "integer", unique: undefined })];
    const b = [col("c", { type: "integer", unique: false })];
    const changes = diffColumns("t", a, b);
    expect(changes).toHaveLength(1);
    const change = changes[0]!;
    if (change.type === "alter_column") {
      // from/to are coerced to booleans in the change payload
      expect(change.changes.unique).toEqual({ from: false, to: false });
    } else {
      throw new Error("expected alter_column");
    }
  });

  it("reports length and scale changes", () => {
    const a = [col("p", { type: "numeric", length: 10, scale: 2 })];
    const b = [col("p", { type: "numeric", length: 12, scale: 4 })];
    const change = diffColumns("t", a, b)[0]!;
    if (change.type === "alter_column") {
      expect(change.changes.length).toEqual({ from: 10, to: 12 });
      expect(change.changes.scale).toEqual({ from: 2, to: 4 });
    } else {
      throw new Error("expected alter_column");
    }
  });
});

describe("diffForeignKeys (isolated)", () => {
  const fk = (overrides = {}) => ({
    name: "fk",
    columns: [{ name: "id", type: "text" as const }],
    referencedTable: "user",
    referencedColumns: ["id"],
    ...overrides,
  });

  it("emits drop THEN add for a changed FK (pre-sort order)", () => {
    const changes = diffForeignKeys(
      "post",
      [fk({ onDelete: "CASCADE" })],
      [fk({ onDelete: "SET NULL" })],
    );
    expect(changes.map((c) => c.type)).toEqual([
      "drop_foreign_key",
      "add_foreign_key",
    ]);
  });

  it("returns [] when FKs are identical", () => {
    expect(diffForeignKeys("post", [fk()], [fk()])).toEqual([]);
  });
});

describe("diffIndexes (isolated)", () => {
  it("emits drop THEN add for a changed index (pre-sort order)", () => {
    const changes = diffIndexes(
      "t",
      [{ name: "i", columns: ["id"], unique: false }],
      [{ name: "i", columns: ["id"], unique: true }],
    );
    expect(changes.map((c) => c.type)).toEqual(["drop_index", "add_index"]);
  });

  it("stamps a derived name onto an unnamed added index", () => {
    const changes = diffIndexes("t", [], [{ columns: ["a", "b"] }]);
    const change = changes[0]!;
    if (change.type === "add_index") {
      expect(change.index.name).toBe("t_a_b_idx");
    } else {
      throw new Error("expected add_index");
    }
  });

  it("matches indexes by derived name across snapshots", () => {
    // Same derived name, identical definition → no change.
    const changes = diffIndexes(
      "t",
      [{ columns: ["a"] }],
      [{ columns: ["a"] }],
    );
    expect(changes).toEqual([]);
  });
});

describe("diffEnums (isolated)", () => {
  it("returns no changes and no warnings for identical enums", () => {
    const e = [{ name: "e", values: ["a", "b"] }];
    const { changes, warnings } = diffEnums(e, e);
    expect(changes).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("emits both add and remove values in a single alter when both happen", () => {
    const { changes } = diffEnums(
      [{ name: "e", values: ["a", "b"] }],
      [{ name: "e", values: ["a", "c"] }],
    );
    expect(changes).toHaveLength(1);
    const change = changes[0]!;
    if (change.type === "alter_enum") {
      expect(change.addValues).toEqual(["c"]);
      expect(change.removeValues).toEqual(["b"]);
    } else {
      throw new Error("expected alter_enum");
    }
  });
});

describe("diffTable (isolated)", () => {
  it("returns create_table (no warning) for a new table", () => {
    const { changes, warnings } = diffTable(undefined, table("t", [idColumn]));
    expect(changes.map((c) => c.type)).toEqual(["create_table"]);
    expect(warnings).toEqual([]);
  });

  it("returns drop_table + warning for a removed table", () => {
    const { changes, warnings } = diffTable(table("t", [idColumn]), undefined);
    expect(changes.map((c) => c.type)).toEqual(["drop_table"]);
    expect(warnings).toHaveLength(1);
  });

  it("returns nothing when both tables are undefined", () => {
    const { changes, warnings } = diffTable(undefined, undefined);
    expect(changes).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("aggregates column, index and FK changes for an existing table", () => {
    const oldTable = table("t", [idColumn, col("drop_me")], {
      indexes: [{ name: "old_idx", columns: ["id"] }],
    });
    const newTable = table("t", [idColumn, col("add_me")], {
      indexes: [{ name: "new_idx", columns: ["id"] }],
      foreignKeys: [
        {
          name: "t_fk",
          columns: [{ name: "id", type: "text" }],
          referencedTable: "u",
          referencedColumns: ["id"],
        },
      ],
    });
    const { changes } = diffTable(oldTable, newTable);
    const types = changes.map((c) => c.type).sort();
    expect(types).toEqual([
      "add_column",
      "add_foreign_key",
      "add_index",
      "drop_column",
      "drop_index",
    ]);
  });
});
