import type {
  SchemaDiff,
  GeneratedMigration,
  MigrationGeneratorOptions,
} from "../../types";
import { generateChangeSQL, generateDescription } from "../changeSql";
import { generateReverseChangeSQL } from "../reverseSql";

// ─── shared defaults ──────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: Required<MigrationGeneratorOptions> = {
  generateDown: true,
  cascadeDrops: false,
  safeMode: true,
  schema: "public",
  reversible: true,
};

function resolveOptions(
  options: MigrationGeneratorOptions,
): Required<MigrationGeneratorOptions> {
  return { ...DEFAULT_OPTIONS, ...options };
}

// ─── diff-based generator ─────────────────────────────────────────────────────

/**
 * Generate UP and DOWN SQL from a `SchemaDiff`.
 *
 * Use this when you have a previous snapshot and a current snapshot and have
 * already computed the diff between them via `diffSnapshots`.
 *
 * Changes are already priority-sorted inside `SchemaDiff`, so UP statements
 * are emitted in dependency order (enums → tables → columns → indexes → FKs).
 * DOWN statements are emitted in reverse order.
 */
export function generateFromDiff(
  diff: SchemaDiff,
  options: MigrationGeneratorOptions = {},
): GeneratedMigration {
  const opts = resolveOptions(options);
  const upStatements: string[] = [];
  const downStatements: string[] = [];

  for (const change of diff.changes) {
    upStatements.push(...generateChangeSQL(change, opts));
  }

  if (opts.generateDown) {
    for (const change of [...diff.changes].reverse()) {
      downStatements.push(...generateReverseChangeSQL(change, opts));
    }
  }

  return {
    upStatements,
    downStatements,
    description: generateDescription(diff),
    warnings: diff.warnings,
  };
}
