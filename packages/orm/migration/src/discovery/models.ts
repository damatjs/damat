/**
 * Model Discovery
 *
 * Scans `{modulesDir}/{moduleName}/models/` and dynamically imports every
 * `.ts` / `.js` file, collecting any exported value that is a `ModelDefinition`
 * (identified by the presence of `toTableSchema` and `_tableName`).
 *
 * This is the bridge between the on-disk module structure and the snapshot /
 * migration generator — no model list ever needs to be passed manually.
 */

import fs from "node:fs";
import path from "node:path";
import type {
  ModelDefinition,
  ModelProperties,
} from "@damatjs/orm-model/types";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Discover all `ModelDefinition` objects exported from a module's models directory.
 *
 * Convention: `{modulesDir}/{moduleName}/models/`
 * Every `.ts` / `.js` file is imported; every export that satisfies
 * `isModelDefinition()` is collected and returned.
 *
 * @param modulesDir - Root modules directory (e.g. `"src/modules"`)
 * @param moduleName - Name of the module   (e.g. `"user"`)
 * @returns Ordered array of discovered model definitions
 *
 * @throws If the `models/` directory is missing, empty, or contains no valid exports
 *
 * @example
 * ```typescript
 * const models = await discoverModels('src/modules', 'user');
 * // → [UserModel, UserProfileModel, ...]
 * ```
 */
export async function discoverModels(
  modulesDir: string,
  moduleName: string,
): Promise<ModelDefinition<ModelProperties>[]> {
  const modelsDir = path.join(modulesDir, moduleName, "models");

  if (!fs.existsSync(modelsDir)) {
    throw new Error(
      `Models directory not found: ${modelsDir}\n` +
        `Expected convention: {modulesDir}/{moduleName}/models/`,
    );
  }

  const files = fs
    .readdirSync(modelsDir)
    .filter((f) => /\.(ts|js)$/.test(f) && !f.endsWith(".d.ts"))
    .sort()
    .map((f) => path.join(modelsDir, f));

  if (files.length === 0) {
    throw new Error(
      `No model files found in ${modelsDir}.\n` +
        `Create at least one .ts file that exports a createModelDefinition() value.`,
    );
  }

  const models: ModelDefinition<ModelProperties>[] = [];

  for (const file of files) {
    const mod = await import(file);
    for (const exported of Object.values(mod)) {
      if (isModelDefinition(exported)) {
        models.push(exported);
      }
    }
  }

  if (models.length === 0) {
    throw new Error(
      `No ModelDefinition exports found in ${modelsDir}.\n` +
        `Make sure each model file exports a value created with createModelDefinition().`,
    );
  }

  return models;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Type guard — returns `true` when `value` looks like a `ModelDefinition`.
 * Checks for the two properties that every model definition must have:
 * a string `_tableName` and a callable `toTableSchema`.
 */
function isModelDefinition(
  value: unknown,
): value is ModelDefinition<ModelProperties> {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as ModelDefinition<ModelProperties>)._tableName ===
      "string" &&
    typeof (value as ModelDefinition<ModelProperties>).toTableSchema ===
      "function"
  );
}
