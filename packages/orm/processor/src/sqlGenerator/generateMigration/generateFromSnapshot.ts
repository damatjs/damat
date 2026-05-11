import type {
  GeneratedMigration,
  MigrationGeneratorOptions,
} from "../../types";
import type { ModuleSchema } from "@damatjs/orm-model";
import { generateTableSql } from "../tables";
import { generateCreateEnum } from "../enums";

// ─── shared defaults ──────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: Required<MigrationGeneratorOptions> = {
  cascadeDrops: false,
  safeMode: true,
  schema: "public",
};

function resolveOptions(
  options: MigrationGeneratorOptions,
): Required<MigrationGeneratorOptions> {
  return { ...DEFAULT_OPTIONS, ...options };
}

// ─── snapshot-based generator ─────────────────────────────────────────────────

/**
 * Generate UP SQL from a `ModuleSchema` alone — no diff required.
 *
 * Use this to produce a fresh baseline migration that creates the entire schema
 * from scratch.
 */
export function generateFromSnapshot(
  snapshot: ModuleSchema,
  options: MigrationGeneratorOptions = {},
): GeneratedMigration {
  // Use module schema if provided, else default to "public"
  if (!options.schema && snapshot.schema) {
    options = { ...options, schema: snapshot.schema };
  }
  const opts = resolveOptions(options);
  const upStatements: string[] = [];
  const warnings: string[] = [];

  // 1. Native enum types first (tables may reference them)
  for (const enumDef of snapshot.enums) {
    upStatements.push(
      generateCreateEnum({ type: "create_enum", enumDef, priority: 0 }, opts),
    );
  }

  // 2. Tables (columns + inline PKs), then their indexes and FKs
  for (const table of snapshot.tables) {
    upStatements.push(...generateTableSql(table as any, opts));
  }

  return {
    upStatements,
    description: `Baseline migration for module "${snapshot.moduleName}" (${snapshot.tables.length} table(s))`,
    warnings,
  };
}
