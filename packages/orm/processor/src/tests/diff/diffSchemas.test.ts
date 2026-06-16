import { describe, it, expect } from "bun:test";
import type { ModuleSchema } from "@damatjs/orm-type";
import { diffSchemas } from "../../diff/diffSchemas";
import { PRIORITY } from "../../diff/priority";
import {
  col,
  idColumn,
  moduleSchema,
  statusEnum,
  statusEnumExtended,
  table,
  userModule,
  userTable,
} from "../__fixtures__/schemas";

describe("diffSchemas › no-op", () => {
  it("returns hasChanges=false for two empty modules", () => {
    const diff = diffSchemas(moduleSchema(), moduleSchema());
    expect(diff.hasChanges).toBe(false);
    expect(diff.changes).toEqual([]);
    expect(diff.warnings).toEqual([]);
  });

  it("returns hasChanges=false for identical non-trivial modules", () => {
    const diff = diffSchemas(userModule, userModule);
    expect(diff.hasChanges).toBe(false);
    expect(diff.changes).toHaveLength(0);
  });

  it("treats a deep-cloned identical module as a no-op", () => {
    const clone: ModuleSchema = JSON.parse(JSON.stringify(userModule));
    const diff = diffSchemas(userModule, clone);
    expect(diff.hasChanges).toBe(false);
  });
});

describe("diffSchemas › tables", () => {
  it("detects an added table as a single create_table change", () => {
    const diff = diffSchemas(moduleSchema(), userModule);
    expect(diff.hasChanges).toBe(true);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("create_table");
    if (change.type === "create_table") {
      expect(change.tableName).toBe("user");
      expect(change.table.columns).toHaveLength(userTable.columns.length);
      expect(change.priority).toBe(PRIORITY.CREATE_TABLE);
    }
  });

  it("detects a removed table as drop_table + a destructive warning", () => {
    const diff = diffSchemas(userModule, moduleSchema());
    expect(diff.hasChanges).toBe(true);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("drop_table");
    if (change.type === "drop_table") {
      expect(change.tableName).toBe("user");
      expect(change.cascade).toBe(true);
      expect(change.priority).toBe(PRIORITY.DROP_TABLE);
    }
    expect(diff.warnings).toHaveLength(1);
    expect(diff.warnings[0]).toContain("Dropping table 'user'");
  });

  it("does not diff internals of a freshly added table", () => {
    // Adding a table with indexes/FKs should still produce only one change.
    const withExtras = moduleSchema({
      tables: [
        table("post", [idColumn], {
          indexes: [{ name: "post_id_idx", columns: ["id"] }],
          foreignKeys: [
            {
              name: "post_user_fk",
              columns: [{ name: "id", type: "text" }],
              referencedTable: "user",
              referencedColumns: ["id"],
            },
          ],
        }),
      ],
    });
    const diff = diffSchemas(moduleSchema(), withExtras);
    expect(diff.changes).toHaveLength(1);
    expect(diff.changes[0]!.type).toBe("create_table");
  });
});

describe("diffSchemas › columns", () => {
  const base = moduleSchema({ tables: [table("user", [idColumn])] });

  it("detects an added column", () => {
    const next = moduleSchema({
      tables: [table("user", [idColumn, col("email")])],
    });
    const diff = diffSchemas(base, next);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("add_column");
    if (change.type === "add_column") {
      expect(change.tableName).toBe("user");
      expect(change.column.name).toBe("email");
      expect(change.priority).toBe(PRIORITY.ADD_COLUMN);
    }
  });

  it("detects a dropped column", () => {
    const prev = moduleSchema({
      tables: [table("user", [idColumn, col("email")])],
    });
    const diff = diffSchemas(prev, base);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("drop_column");
    if (change.type === "drop_column") {
      expect(change.columnName).toBe("email");
      expect(change.priority).toBe(PRIORITY.DROP_COLUMN);
    }
  });

  it("detects a column type change", () => {
    const prev = moduleSchema({
      tables: [table("t", [col("age", { type: "integer" })])],
    });
    const next = moduleSchema({
      tables: [table("t", [col("age", { type: "bigint" })])],
    });
    const diff = diffSchemas(prev, next);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("alter_column");
    if (change.type === "alter_column") {
      expect(change.changes.type).toEqual({ from: "integer", to: "bigint" });
      expect(change.changes.nullable).toBeUndefined();
    }
  });

  it("detects a nullability change", () => {
    const prev = moduleSchema({
      tables: [table("t", [col("name", { nullable: false })])],
    });
    const next = moduleSchema({
      tables: [table("t", [col("name", { nullable: true })])],
    });
    const diff = diffSchemas(prev, next);
    const change = diff.changes[0]!;
    expect(change.type).toBe("alter_column");
    if (change.type === "alter_column") {
      expect(change.changes.nullable).toEqual({ from: false, to: true });
    }
  });

  it("detects a default value change", () => {
    const prev = moduleSchema({
      tables: [table("t", [col("n", { type: "integer", default: "0" })])],
    });
    const next = moduleSchema({
      tables: [table("t", [col("n", { type: "integer", default: "1" })])],
    });
    const diff = diffSchemas(prev, next);
    const change = diff.changes[0]!;
    if (change.type === "alter_column") {
      expect(change.changes.default).toEqual({ from: "0", to: "1" });
    } else {
      throw new Error("expected alter_column");
    }
  });

  it("collapses several simultaneous attribute changes into one alter_column", () => {
    const prev = moduleSchema({
      tables: [
        table("t", [
          col("c", { type: "integer", nullable: false, unique: false }),
        ]),
      ],
    });
    const next = moduleSchema({
      tables: [
        table("t", [
          col("c", { type: "bigint", nullable: true, unique: true }),
        ]),
      ],
    });
    const diff = diffSchemas(prev, next);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    if (change.type === "alter_column") {
      expect(change.changes.type).toEqual({ from: "integer", to: "bigint" });
      expect(change.changes.nullable).toEqual({ from: false, to: true });
      expect(change.changes.unique).toEqual({ from: false, to: true });
    } else {
      throw new Error("expected alter_column");
    }
  });

  it("emits add + drop for a simultaneous add and remove", () => {
    const prev = moduleSchema({
      tables: [table("t", [idColumn, col("old")])],
    });
    const next = moduleSchema({
      tables: [table("t", [idColumn, col("new")])],
    });
    const diff = diffSchemas(prev, next);
    const types = diff.changes.map((c) => c.type).sort();
    expect(types).toEqual(["add_column", "drop_column"]);
  });
});

describe("diffSchemas › enums", () => {
  it("detects an added enum (create_enum)", () => {
    const diff = diffSchemas(
      moduleSchema(),
      moduleSchema({ enums: [statusEnum] }),
    );
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("create_enum");
    if (change.type === "create_enum") {
      expect(change.enumDef.name).toBe("user_status");
      expect(change.priority).toBe(PRIORITY.CREATE_ENUM);
    }
  });

  it("detects a removed enum (drop_enum)", () => {
    const diff = diffSchemas(
      moduleSchema({ enums: [statusEnum] }),
      moduleSchema(),
    );
    expect(diff.changes).toHaveLength(1);
    expect(diff.changes[0]!.type).toBe("drop_enum");
  });

  it("detects enum value additions (alter_enum, no warning)", () => {
    const diff = diffSchemas(
      moduleSchema({ enums: [statusEnum] }),
      moduleSchema({ enums: [statusEnumExtended] }),
    );
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("alter_enum");
    if (change.type === "alter_enum") {
      expect(change.addValues).toEqual(["banned"]);
      expect(change.removeValues).toBeUndefined();
    }
    expect(diff.warnings).toHaveLength(0);
  });

  it("detects enum value removals and warns", () => {
    const diff = diffSchemas(
      moduleSchema({ enums: [statusEnumExtended] }),
      moduleSchema({ enums: [statusEnum] }),
    );
    const change = diff.changes[0]!;
    if (change.type === "alter_enum") {
      expect(change.removeValues).toEqual(["banned"]);
      expect(change.addValues).toBeUndefined();
    } else {
      throw new Error("expected alter_enum");
    }
    expect(diff.warnings.length).toBeGreaterThan(0);
    expect(diff.warnings[0]).toContain("Removing values from enum 'user_status'");
  });

  it("treats reordered enum values as a no-op (order-insensitive)", () => {
    const a = moduleSchema({
      enums: [{ name: "e", values: ["x", "y", "z"] }],
    });
    const b = moduleSchema({
      enums: [{ name: "e", values: ["z", "x", "y"] }],
    });
    const diff = diffSchemas(a, b);
    expect(diff.hasChanges).toBe(false);
  });
});

describe("diffSchemas › indexes", () => {
  const withoutIdx = moduleSchema({ tables: [table("t", [idColumn])] });

  it("detects an added index", () => {
    const next = moduleSchema({
      tables: [
        table("t", [idColumn], {
          indexes: [{ name: "t_id_idx", columns: ["id"], unique: true }],
        }),
      ],
    });
    const diff = diffSchemas(withoutIdx, next);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("add_index");
    if (change.type === "add_index") {
      expect(change.index.name).toBe("t_id_idx");
      expect(change.priority).toBe(PRIORITY.ADD_INDEX);
    }
  });

  it("detects a dropped index", () => {
    const prev = moduleSchema({
      tables: [
        table("t", [idColumn], {
          indexes: [{ name: "t_id_idx", columns: ["id"] }],
        }),
      ],
    });
    const diff = diffSchemas(prev, withoutIdx);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("drop_index");
    if (change.type === "drop_index") {
      expect(change.indexName).toBe("t_id_idx");
    }
  });

  it("treats a changed index as drop + re-add", () => {
    const prev = moduleSchema({
      tables: [
        table("t", [idColumn], {
          indexes: [{ name: "t_idx", columns: ["id"], unique: false }],
        }),
      ],
    });
    const next = moduleSchema({
      tables: [
        table("t", [idColumn], {
          indexes: [{ name: "t_idx", columns: ["id"], unique: true }],
        }),
      ],
    });
    const diff = diffSchemas(prev, next);
    const types = diff.changes.map((c) => c.type);
    expect(diff.changes).toHaveLength(2);
    // The drop MUST precede the re-add after priority-sorting, otherwise the
    // SQL tries to CREATE an index that still exists. READD_INDEX (115) sorts
    // just after DROP_INDEX (110) to guarantee this.
    expect(types).toEqual(["drop_index", "add_index"]);
    expect(diff.changes[0]!.priority).toBeLessThan(diff.changes[1]!.priority);
  });

  it("derives an index name from columns when none is provided", () => {
    const next = moduleSchema({
      tables: [
        table("t", [idColumn, col("a"), col("b")], {
          indexes: [{ columns: ["a", "b"] }],
        }),
      ],
    });
    const diff = diffSchemas(
      moduleSchema({ tables: [table("t", [idColumn, col("a"), col("b")])] }),
      next,
    );
    const change = diff.changes[0]!;
    if (change.type === "add_index") {
      expect(change.index.name).toBe("t_a_b_idx");
    } else {
      throw new Error("expected add_index");
    }
  });
});

describe("diffSchemas › foreign keys", () => {
  const noFk = moduleSchema({ tables: [table("post", [idColumn])] });

  it("detects an added foreign key", () => {
    const next = moduleSchema({
      tables: [
        table("post", [idColumn], {
          foreignKeys: [
            {
              name: "post_user_fk",
              columns: [{ name: "id", type: "text" }],
              referencedTable: "user",
              referencedColumns: ["id"],
            },
          ],
        }),
      ],
    });
    const diff = diffSchemas(noFk, next);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("add_foreign_key");
    if (change.type === "add_foreign_key") {
      expect(change.foreignKey.name).toBe("post_user_fk");
      expect(change.priority).toBe(PRIORITY.ADD_FOREIGN_KEY);
    }
  });

  it("detects a dropped foreign key", () => {
    const prev = moduleSchema({
      tables: [
        table("post", [idColumn], {
          foreignKeys: [
            {
              name: "post_user_fk",
              columns: [{ name: "id", type: "text" }],
              referencedTable: "user",
              referencedColumns: ["id"],
            },
          ],
        }),
      ],
    });
    const diff = diffSchemas(prev, noFk);
    expect(diff.changes).toHaveLength(1);
    const change = diff.changes[0]!;
    expect(change.type).toBe("drop_foreign_key");
    if (change.type === "drop_foreign_key") {
      expect(change.constraintName).toBe("post_user_fk");
    }
  });

  it("treats a changed foreign key as drop + re-add", () => {
    const prev = moduleSchema({
      tables: [
        table("post", [idColumn], {
          foreignKeys: [
            {
              name: "fk",
              columns: [{ name: "id", type: "text" }],
              referencedTable: "user",
              referencedColumns: ["id"],
              onDelete: "CASCADE",
            },
          ],
        }),
      ],
    });
    const next = moduleSchema({
      tables: [
        table("post", [idColumn], {
          foreignKeys: [
            {
              name: "fk",
              columns: [{ name: "id", type: "text" }],
              referencedTable: "user",
              referencedColumns: ["id"],
              onDelete: "SET NULL",
            },
          ],
        }),
      ],
    });
    const diff = diffSchemas(prev, next);
    const types = diff.changes.map((c) => c.type);
    // A changed FK produces both a drop and an add. After diffSchemas
    // priority-sorts, the drop MUST come before the re-add — otherwise the SQL
    // tries to ADD a constraint that still exists. READD_FOREIGN_KEY (105) sorts
    // just after DROP_FOREIGN_KEY (100) to guarantee this.
    expect(types).toEqual(["drop_foreign_key", "add_foreign_key"]);
    expect(diff.changes[0]!.priority).toBeLessThan(diff.changes[1]!.priority);
  });
});

describe("diffSchemas › ordering & combined changes", () => {
  it("sorts changes by ascending priority (create before drop)", () => {
    const prev = moduleSchema({
      tables: [table("old", [idColumn])],
    });
    const next = moduleSchema({
      enums: [statusEnum],
      tables: [table("new", [idColumn])],
    });
    const diff = diffSchemas(prev, next);
    const priorities = diff.changes.map((c) => c.priority);
    const sorted = [...priorities].sort((a, b) => a - b);
    expect(priorities).toEqual(sorted);
    // create_enum (10) < create_table (20) < drop_table (130)
    expect(diff.changes.map((c) => c.type)).toEqual([
      "create_enum",
      "create_table",
      "drop_table",
    ]);
  });

  it("orders create_table before add_foreign_key for a brand new schema", () => {
    // Both tables are new; the FK change comes from diffing an existing table.
    const prev = moduleSchema({
      tables: [table("user", [idColumn]), table("post", [idColumn])],
    });
    const next = moduleSchema({
      tables: [
        table("user", [idColumn]),
        table("post", [idColumn], {
          foreignKeys: [
            {
              name: "post_user_fk",
              columns: [{ name: "id", type: "text" }],
              referencedTable: "user",
              referencedColumns: ["id"],
            },
          ],
        }),
      ],
    });
    const diff = diffSchemas(prev, next);
    expect(diff.changes.map((c) => c.type)).toEqual(["add_foreign_key"]);
    expect(diff.changes[0]!.priority).toBe(PRIORITY.ADD_FOREIGN_KEY);
  });

  it("handles many simultaneous changes across tables, columns, enums", () => {
    const prev = moduleSchema({
      enums: [statusEnum],
      tables: [
        table("keep", [idColumn, col("drop_me")]),
        table("remove", [idColumn]),
      ],
    });
    const next = moduleSchema({
      enums: [statusEnumExtended],
      tables: [
        table("keep", [idColumn, col("add_me")]),
        table("brand_new", [idColumn]),
      ],
    });
    const diff = diffSchemas(prev, next);
    const counts: Record<string, number> = {};
    for (const c of diff.changes) counts[c.type] = (counts[c.type] ?? 0) + 1;
    expect(counts.alter_enum).toBe(1);
    expect(counts.add_column).toBe(1);
    expect(counts.drop_column).toBe(1);
    expect(counts.create_table).toBe(1);
    expect(counts.drop_table).toBe(1);
    // Priority order must be globally sorted.
    const ps = diff.changes.map((c) => c.priority);
    expect(ps).toEqual([...ps].sort((a, b) => a - b));
  });
});
