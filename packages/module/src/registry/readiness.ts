import { join } from "node:path";
import { existsSync, readdirSync } from "node:fs";
import { readModuleManifest } from "../manifest/read";
import { DEFAULT_MODULE_PATHS, type ModuleManifest } from "../manifest/types";
import type { ModuleValidationReport } from "./types";

/**
 * Check that a module directory honours the module contract, and report
 * what's still missing for registry publishing.
 *
 * Errors  → the module can't be installed (`damat module add` would fail
 *           or produce a broken app).
 * Warnings → the module works locally but isn't registry-ready yet.
 */
export function validateModuleDir(moduleDir: string): ModuleValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  let manifest: ModuleManifest | null = null;

  if (!existsSync(moduleDir)) {
    return {
      valid: false,
      errors: [`Module directory not found: ${moduleDir}`],
      warnings,
      manifest,
    };
  }

  try {
    manifest = readModuleManifest(moduleDir);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
    return { valid: false, errors, warnings, manifest };
  }

  const paths = { ...DEFAULT_MODULE_PATHS, ...manifest.paths };

  // Entry must exist — it's what damat.config.ts resolves
  const entryPath = join(moduleDir, paths.entry);
  if (!existsSync(entryPath)) {
    errors.push(
      `Entry "${paths.entry}" not found (must default-export defineModule(...))`,
    );
  }

  // Declared layout dirs must exist when explicitly set in the manifest
  for (const key of ["models", "migrations", "workflows", "types"] as const) {
    const declared = manifest.paths?.[key];
    if (declared && !existsSync(join(moduleDir, declared))) {
      errors.push(`Declared paths.${key} "${declared}" does not exist`);
    }
  }

  // Models without migrations means the schema can't be applied on install
  const modelsDir = join(moduleDir, paths.models);
  const migrationsDir = join(moduleDir, paths.migrations);
  if (existsSync(modelsDir)) {
    if (!existsSync(migrationsDir)) {
      warnings.push(
        `Module has models but no "${paths.migrations}" directory — run damat-orm migrate:create`,
      );
    } else if (
      !readdirSync(migrationsDir).some((file) => file.endsWith(".sql"))
    ) {
      warnings.push(
        `"${paths.migrations}" contains no .sql migrations — run damat-orm migrate:create`,
      );
    }
  }

  // Registry-readiness — the registry indexes these fields
  if (!manifest.version)
    warnings.push('Missing "version" — required for registry publishing');
  if (!manifest.description)
    warnings.push('Missing "description" — shown in registry search');
  if (!manifest.author) {
    warnings.push(
      'Missing "author" — shown in the registry and recorded as install provenance',
    );
  }
  if (!manifest.registry?.license) {
    warnings.push(
      'Missing "registry.license" — required for registry publishing',
    );
  }
  if (!manifest.registry?.namespace) {
    warnings.push(
      'Missing "registry.namespace" — modules publish under a namespace',
    );
  }

  return { valid: errors.length === 0, errors, warnings, manifest };
}
