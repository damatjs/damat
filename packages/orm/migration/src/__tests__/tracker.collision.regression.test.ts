import { describe, it, expect } from "bun:test";
import { MigrationTracker } from "../tracker";

/**
 * Regression for the id-collision bug: `id = ${module}_${name}` is ambiguous —
 * module `a_b` + name `c` and module `a` + name `b_c` both collapse to `a_b_c`.
 * With `ON CONFLICT (id)` the second insert would clobber the first module's row.
 *
 * The fake pg Pool below is stateful and faithfully models BOTH unique
 * constraints (`id` PK and UNIQUE(module, name)) AND the SQL's ON CONFLICT
 * target, so it exposes the clobber if the code ever regresses. No live DB.
 */

interface Row {
  id: string;
  module: string;
  name: string;
  status: string;
}

function makeStatefulPool() {
  const rows: Row[] = [];
  const pool = {
    query: async (sql: string, params: unknown[] = []) => {
      if (/INSERT INTO "_damat_migration_logs"/.test(sql)) {
        const [id, module, name] = params as [string, string, string];
        const target = /ON CONFLICT \(([^)]+)\)/
          .exec(sql)![1]!
          .split(",")
          .map((c) => c.trim());
        const incoming: Row = { id, module, name, status: "applied" };
        const match = rows.find((r) =>
          target.every((c) => r[c as keyof Row] === incoming[c as keyof Row]),
        );
        if (match) {
          match.status = "applied"; // DO UPDATE SET status = 'applied'
          return { rows: [], rowCount: 1 };
        }
        // No conflict-target match => every other unique constraint must hold.
        if (rows.some((r) => r.id === id)) {
          throw new Error(`duplicate key value violates unique constraint (id=${id})`);
        }
        if (rows.some((r) => r.module === module && r.name === name)) {
          throw new Error("duplicate key value violates UNIQUE(module, name)");
        }
        rows.push(incoming);
        return { rows: [], rowCount: 1 };
      }
      if (/status = 'applied'/.test(sql)) {
        const module = params[0] as string | undefined;
        const matched = rows.filter(
          (r) => r.status === "applied" && (!module || r.module === module),
        );
        return { rows: matched, rowCount: matched.length };
      }
      return { rows: [], rowCount: 0 };
    },
  };
  return { pool: pool as any, rows };
}

describe("MigrationTracker — id collision cannot clobber a different module", () => {
  it("records two colliding (module, name) pairs as two distinct rows", async () => {
    const { pool, rows } = makeStatefulPool();
    const tracker = new MigrationTracker(pool);

    await tracker.recordApplied("a_b", "c", 1);
    await tracker.recordApplied("a", "b_c", 1);

    // Two physically distinct rows, distinct ids — neither overwrote the other.
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.id)).size).toBe(2);

    // Both read back as applied for their own module.
    expect((await tracker.getApplied("a_b")).map((r) => r.name)).toEqual(["c"]);
    expect((await tracker.getApplied("a")).map((r) => r.name)).toEqual(["b_c"]);
  });

  it("re-applying the same (module, name) upserts in place (no second row)", async () => {
    const { pool, rows } = makeStatefulPool();
    const tracker = new MigrationTracker(pool);

    await tracker.recordApplied("user", "Migration1_Initial", 10);
    await tracker.recordApplied("user", "Migration1_Initial", 20);

    expect(rows).toHaveLength(1);
    expect((await tracker.getApplied("user")).map((r) => r.name)).toEqual([
      "Migration1_Initial",
    ]);
  });

  it("a pre-existing old-scheme row still reads as applied and is not re-inserted", async () => {
    const { pool, rows } = makeStatefulPool();
    // Seed a row written by the OLD `${module}_${name}` id scheme.
    rows.push({ id: "user_Migration1_Initial", module: "user", name: "Migration1_Initial", status: "applied" });
    const tracker = new MigrationTracker(pool);

    // Re-recording matches on UNIQUE(module, name) despite the differing id.
    await tracker.recordApplied("user", "Migration1_Initial", 5);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("user_Migration1_Initial"); // id untouched
    expect((await tracker.getApplied("user")).map((r) => r.name)).toEqual([
      "Migration1_Initial",
    ]);
  });
});
