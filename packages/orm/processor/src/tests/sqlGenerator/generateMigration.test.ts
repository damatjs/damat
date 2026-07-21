import { describe, it, expect } from "bun:test";
import type { ModuleSchema } from "@damatjs/orm-type";
import { diffSchemas } from "../../diff/diffSchemas";
import { reverseDiff } from "../../diff/reverse";
import { generateFromDiff } from "../../sqlGenerator/generateMigration/generateFromDiff";
import { generateFromSnapshot } from "../../sqlGenerator/generateMigration/generateFromSnapshot";
import {
  col,
  idColumn,
  moduleSchema,
  statusEnum,
  statusEnumExtended,
  table,
} from "../__fixtures__/schemas";

// ─── generateFromDiff ──────────────────────────────────────────────────────

describe("generateFromDiff", () => {
  it("returns no statements for an empty diff", () => {
    const result = generateFromDiff(
      diffSchemas(moduleSchema(), moduleSchema()),
    );
    expect(result.upStatements).toEqual([]);
    expect(result.description).toBe("No changes");
    expect(result.warnings).toEqual([]);
  });

  it("emits CREATE TABLE for a newly added table", () => {
    const next = moduleSchema({
      tables: [table("user", [idColumn, col("email", { unique: true })])],
    });
    const result = generateFromDiff(diffSchemas(moduleSchema(), next));
    expect(result.upStatements).toHaveLength(1);
    expect(result.upStatements[0]).toContain(
      'CREATE TABLE IF NOT EXISTS "public"."user"',
    );
    expect(result.description).toBe("1 table created");
  });

  it("propagates destructive warnings from the diff", () => {
    const prev = moduleSchema({ tables: [table("user", [idColumn])] });
    const result = generateFromDiff(diffSchemas(prev, moduleSchema()));
    expect(result.upStatements[0]).toContain("DROP TABLE");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Dropping table 'user'");
  });

  it("emits enum-creation DDL before table-creation DDL (priority order)", () => {
    const next = moduleSchema({
      enums: [statusEnum],
      tables: [
        table("user", [
          idColumn,
          col("status", { type: "enum", enum: "user_status" }),
        ]),
      ],
    });
    const result = generateFromDiff(diffSchemas(moduleSchema(), next));
    const enumIdx = result.upStatements.findIndex((s) =>
      s.includes("CREATE TYPE"),
    );
    const tableIdx = result.upStatements.findIndex((s) =>
      s.includes("CREATE TABLE"),
    );
    expect(enumIdx).toBeGreaterThanOrEqual(0);
    expect(tableIdx).toBeGreaterThan(enumIdx);
  });

  it("orders add_index and add_foreign_key after the table they belong to", () => {
    // Diff an existing table that gains an index and an FK.
    const prev = moduleSchema({
      tables: [
        table("user", [idColumn]),
        table("post", [idColumn, col("user_id")]),
      ],
    });
    const next = moduleSchema({
      tables: [
        table("user", [idColumn]),
        table("post", [idColumn, col("user_id")], {
          indexes: [{ name: "post_user_idx", columns: ["user_id"] }],
          foreignKeys: [
            {
              name: "post_user_fk",
              columns: [{ name: "user_id", type: "text" }],
              referencedTable: "user",
              referencedColumns: ["id"],
            },
          ],
        }),
      ],
    });
    const result = generateFromDiff(diffSchemas(prev, next));
    const idxIdx = result.upStatements.findIndex((s) =>
      s.includes("CREATE INDEX"),
    );
    const fkIdx = result.upStatements.findIndex((s) =>
      s.includes("ADD CONSTRAINT"),
    );
    expect(idxIdx).toBeGreaterThanOrEqual(0);
    expect(fkIdx).toBeGreaterThan(idxIdx); // index (40) before FK (50)
  });

  it("emits DROP CONSTRAINT before ADD CONSTRAINT for a changed FK", () => {
    // A changed FK is a drop + re-add; the drop must precede the add or the
    // ADD CONSTRAINT fails because the old constraint still exists.
    const fk = (onDelete: "CASCADE" | "SET NULL") => ({
      name: "post_user_fk",
      columns: [{ name: "user_id", type: "text" as const }],
      referencedTable: "user",
      referencedColumns: ["id"],
      onDelete,
    });
    const prev = moduleSchema({
      tables: [
        table("post", [idColumn, col("user_id")], {
          foreignKeys: [fk("CASCADE")],
        }),
      ],
    });
    const next = moduleSchema({
      tables: [
        table("post", [idColumn, col("user_id")], {
          foreignKeys: [fk("SET NULL")],
        }),
      ],
    });
    const result = generateFromDiff(diffSchemas(prev, next));
    const dropIdx = result.upStatements.findIndex((s) =>
      s.includes("DROP CONSTRAINT"),
    );
    const addIdx = result.upStatements.findIndex((s) =>
      s.includes("ADD CONSTRAINT"),
    );
    expect(dropIdx).toBeGreaterThanOrEqual(0);
    expect(addIdx).toBeGreaterThanOrEqual(0);
    expect(dropIdx).toBeLessThan(addIdx);
  });

  it("emits DROP INDEX before CREATE INDEX for a changed index", () => {
    // A changed index is a drop + re-add; the drop must precede the create or
    // CREATE INDEX fails because the old index still exists.
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
    const result = generateFromDiff(diffSchemas(prev, next));
    const dropIdx = result.upStatements.findIndex((s) =>
      s.includes("DROP INDEX"),
    );
    const createIdx = result.upStatements.findIndex(
      (s) => s.includes("CREATE") && s.includes("INDEX") && !s.includes("DROP"),
    );
    expect(dropIdx).toBeGreaterThanOrEqual(0);
    expect(createIdx).toBeGreaterThanOrEqual(0);
    expect(dropIdx).toBeLessThan(createIdx);
  });

  it("keeps each DROP before its re-ADD when an FK and an index change together", () => {
    // Both a changed FK and a changed index in one diff. After priority-sorting
    // the global statement list, every DROP must still precede its own re-ADD,
    // or PostgreSQL rejects the ADD/CREATE because the old object still exists.
    const fk = (onDelete: "CASCADE" | "SET NULL") => ({
      name: "post_user_fk",
      columns: [{ name: "user_id", type: "text" as const }],
      referencedTable: "user",
      referencedColumns: ["id"],
      onDelete,
    });
    const prev = moduleSchema({
      tables: [
        table("post", [idColumn, col("user_id")], {
          foreignKeys: [fk("CASCADE")],
          indexes: [
            { name: "post_user_idx", columns: ["user_id"], unique: false },
          ],
        }),
      ],
    });
    const next = moduleSchema({
      tables: [
        table("post", [idColumn, col("user_id")], {
          foreignKeys: [fk("SET NULL")],
          indexes: [
            { name: "post_user_idx", columns: ["user_id"], unique: true },
          ],
        }),
      ],
    });
    const stmts = generateFromDiff(diffSchemas(prev, next)).upStatements;

    const dropFkIdx = stmts.findIndex((s) => s.includes("DROP CONSTRAINT"));
    const addFkIdx = stmts.findIndex((s) => s.includes("ADD CONSTRAINT"));
    const dropIdxIdx = stmts.findIndex((s) => s.includes("DROP INDEX"));
    const createIdxIdx = stmts.findIndex(
      (s) => s.includes("CREATE") && s.includes("INDEX") && !s.includes("DROP"),
    );

    expect(dropFkIdx).toBeGreaterThanOrEqual(0);
    expect(addFkIdx).toBeGreaterThanOrEqual(0);
    expect(dropIdxIdx).toBeGreaterThanOrEqual(0);
    expect(createIdxIdx).toBeGreaterThanOrEqual(0);
    // DROP precedes ADD for the FK …
    expect(dropFkIdx).toBeLessThan(addFkIdx);
    // … and DROP precedes CREATE for the index.
    expect(dropIdxIdx).toBeLessThan(createIdxIdx);
  });

  it("honors safeMode:false and a custom schema option", () => {
    const next = moduleSchema({ tables: [table("t", [idColumn])] });
    const result = generateFromDiff(diffSchemas(moduleSchema(), next), {
      safeMode: false,
      schema: "store",
    });
    expect(result.upStatements[0]).toContain('CREATE TABLE "store"."t"');
    expect(result.upStatements[0]).not.toContain("IF NOT EXISTS");
  });

  it("expands a multi-attribute alter_column into several statements", () => {
    const prev = moduleSchema({
      tables: [table("t", [col("c", { type: "integer", nullable: true })])],
    });
    const next = moduleSchema({
      tables: [
        table("t", [
          col("c", { type: "bigint", nullable: false, default: "0" }),
        ]),
      ],
    });
    const result = generateFromDiff(diffSchemas(prev, next));
    expect(result.upStatements.length).toBe(3);
    expect(result.upStatements.some((s) => s.includes("TYPE BIGINT"))).toBe(
      true,
    );
    expect(result.upStatements.some((s) => s.includes("SET NOT NULL"))).toBe(
      true,
    );
    expect(result.upStatements.some((s) => s.includes("SET DEFAULT 0"))).toBe(
      true,
    );
  });
});

// ─── generateFromSnapshot ──────────────────────────────────────────────────

describe("generateFromSnapshot", () => {
  it("produces a baseline that creates enums, tables, indexes and FKs in order", () => {
    const snapshot: ModuleSchema = moduleSchema({
      moduleName: "shop",
      enums: [statusEnum],
      tables: [
        table(
          "user",
          [idColumn, col("status", { type: "enum", enum: "user_status" })],
          {
            indexes: [{ name: "user_status_idx", columns: ["status"] }],
          },
        ),
        table("post", [idColumn, col("author_id")], {
          foreignKeys: [
            {
              name: "post_author_fk",
              columns: [{ name: "author_id", type: "text" }],
              referencedTable: "user",
              referencedColumns: ["id"],
            },
          ],
        }),
      ],
    });
    const result = generateFromSnapshot(snapshot);
    const stmts = result.upStatements;

    const enumIdx = stmts.findIndex((s) => s.includes("CREATE TYPE"));
    const tableIdx = stmts.findIndex((s) => s.includes("CREATE TABLE"));
    const indexIdx = stmts.findIndex((s) => s.includes("CREATE INDEX"));
    const fkIdx = stmts.findIndex((s) => s.includes("ADD CONSTRAINT"));

    expect(enumIdx).toBeGreaterThanOrEqual(0);
    expect(enumIdx).toBeLessThan(tableIdx);
    expect(tableIdx).toBeLessThan(indexIdx);
    expect(indexIdx).toBeLessThan(fkIdx);

    expect(result.description).toContain(
      'Baseline migration for module "shop"',
    );
    expect(result.description).toContain("2 table(s)");
  });

  it("creates all tables before any foreign key (cross-table dependency safety)", () => {
    const snapshot = moduleSchema({
      tables: [
        table("user", [idColumn]),
        table("post", [idColumn, col("user_id")], {
          foreignKeys: [
            {
              name: "post_user_fk",
              columns: [{ name: "user_id", type: "text" }],
              referencedTable: "user",
              referencedColumns: ["id"],
            },
          ],
        }),
      ],
    });
    const stmts = generateFromSnapshot(snapshot).upStatements;
    const lastTableIdx = stmts.reduce(
      (acc, s, i) => (s.includes("CREATE TABLE") ? i : acc),
      -1,
    );
    const fkIdx = stmts.findIndex((s) => s.includes("ADD CONSTRAINT"));
    expect(fkIdx).toBeGreaterThan(lastTableIdx);
  });

  it("returns no statements for an empty module", () => {
    const result = generateFromSnapshot(moduleSchema({ moduleName: "empty" }));
    expect(result.upStatements).toEqual([]);
    expect(result.description).toContain("0 table(s)");
  });

  it("defaults the schema from the snapshot's own schema field", () => {
    const snapshot = moduleSchema({
      schema: "store",
      tables: [table("t", [idColumn])],
    });
    const result = generateFromSnapshot(snapshot);
    expect(result.upStatements[0]).toContain('"store"."t"');
  });

  it("explicit option schema overrides the snapshot schema", () => {
    const snapshot = moduleSchema({
      schema: "store",
      tables: [table("t", [idColumn])],
    });
    const result = generateFromSnapshot(snapshot, { schema: "override" });
    expect(result.upStatements[0]).toContain('"override"."t"');
  });
});

// ─── round-trip: snapshot → diff → up, reverse → down ──────────────────────

describe("up/down migration via diff + reverse", () => {
  it("a create migration reverses into a matching drop migration", () => {
    const empty = moduleSchema();
    const next = moduleSchema({
      enums: [statusEnum],
      tables: [table("user", [idColumn])],
    });
    const diff = diffSchemas(empty, next);

    const up = generateFromDiff(diff);
    expect(up.upStatements.some((s) => s.includes("CREATE TYPE"))).toBe(true);
    expect(up.upStatements.some((s) => s.includes("CREATE TABLE"))).toBe(true);

    const down = generateFromDiff(reverseDiff(diff));
    // reverse order: drop table before drop enum
    const dropTableIdx = down.upStatements.findIndex((s) =>
      s.includes("DROP TABLE"),
    );
    const dropEnumIdx = down.upStatements.findIndex((s) =>
      s.includes("DROP TYPE"),
    );
    expect(dropTableIdx).toBeGreaterThanOrEqual(0);
    expect(dropEnumIdx).toBeGreaterThan(dropTableIdx);
  });

  it("an alter_column reverses to the inverse SQL", () => {
    const prev = moduleSchema({
      tables: [table("t", [col("c", { type: "integer", nullable: false })])],
    });
    const next = moduleSchema({
      tables: [table("t", [col("c", { type: "bigint", nullable: true })])],
    });
    const diff = diffSchemas(prev, next);

    const up = generateFromDiff(diff).upStatements;
    expect(up.some((s) => s.includes("TYPE BIGINT"))).toBe(true);
    expect(up.some((s) => s.includes("DROP NOT NULL"))).toBe(true);

    const down = generateFromDiff(reverseDiff(diff)).upStatements;
    expect(down.some((s) => s.includes("TYPE INTEGER"))).toBe(true);
    expect(down.some((s) => s.includes("SET NOT NULL"))).toBe(true);
  });

  it("an enum value addition reverses to the removal advisory comment", () => {
    const diff = diffSchemas(
      moduleSchema({ enums: [statusEnum] }),
      moduleSchema({ enums: [statusEnumExtended] }),
    );
    const up = generateFromDiff(diff).upStatements;
    expect(up.some((s) => s.includes("ADD VALUE IF NOT EXISTS 'banned'"))).toBe(
      true,
    );

    const down = generateFromDiff(reverseDiff(diff)).upStatements;
    expect(down.some((s) => s.includes("-- Removing enum values"))).toBe(true);
  });
});
