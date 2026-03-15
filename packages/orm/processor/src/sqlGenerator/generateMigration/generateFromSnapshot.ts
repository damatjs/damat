import type {
  GeneratedMigration,
  MigrationGeneratorOptions,
} from "../../types";
import type { ModuleSnapshot } from "../../types/snapshot";
import { generateTableSql } from "../tables";
import { generateCreateEnum } from "../enums";

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

// ─── snapshot-based generator ─────────────────────────────────────────────────

/**
 * Generate UP and DOWN SQL from a `ModuleSnapshot` alone — no diff required.
 *
 * Use this to produce a fresh baseline migration that creates the entire schema
 * from scratch. The DOWN migration drops everything in reverse dependency order.
 */
export function generateFromSnapshot(
  snapshot: ModuleSnapshot,
  options: MigrationGeneratorOptions = {},
): GeneratedMigration {
  const opts = resolveOptions(options);
  const upStatements: string[] = [];
  const downStatements: string[] = [];
  const warnings: string[] = [];

  // 1. Native enum types first (tables may reference them)
  for (const enumDef of Object.values(snapshot.nativeEnums)) {
    upStatements.push(
      generateCreateEnum({ type: "create_enum", enumDef, priority: 0 }, opts),
    );
  }

  // 2. Tables (columns + inline PKs), then their indexes and FKs
  for (const table of snapshot.tables) {
    upStatements.push(...generateTableSql(table, opts));
  }

  if (opts.generateDown) {
    // Reverse: drop FKs are implicit via CASCADE on DROP TABLE,
    // so we only need to drop tables then enums.
    const safeMode = opts.safeMode !== false;
    const cascade = " CASCADE";

    for (const table of [...snapshot.tables].reverse()) {
      const schema = opts.schema ?? table.schema ?? "public";
      const fullName = `"${schema}"."${table.name}"`;
      const ifExists = safeMode ? " IF EXISTS" : "";
      downStatements.push(`DROP TABLE${ifExists} ${fullName}${cascade}`);
    }

    for (const enumDef of Object.values(snapshot.nativeEnums).reverse()) {
      const schema = enumDef.schema ?? opts.schema ?? "public";
      const typeName = `"${schema}"."${enumDef.name}"`;
      const ifExists = safeMode ? " IF EXISTS" : "";
      downStatements.push(`DROP TYPE${ifExists} ${typeName}${cascade}`);
    }
  }

  return {
    upStatements,
    downStatements,
    description: `Baseline migration for module "${snapshot.name}" (${snapshot.tables.length} table(s))`,
    warnings,
  };
}
