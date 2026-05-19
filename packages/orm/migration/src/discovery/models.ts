import fs from "node:fs";
import path from "node:path";
import type { ModelDefinition } from "@damatjs/orm-model";

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
  moduleResolver: string,
): Promise<ModelDefinition[]> {
  const modelDir = path.join(moduleResolver, "models");

  if (!fs.existsSync(modelDir)) {
    throw new Error(
      `Models directory not found: ${modelDir}\n` +
      `Expected convention: {modulesDir}/{moduleName}/models/`,
    );
  }

  const files = fs
    .readdirSync(modelDir)
    .filter(
      (f) =>
        /\.(ts|js)$/.test(f) &&
        !f.endsWith(".d.ts") &&
        f !== "index.ts" &&
        f !== "index.js",
    )
    .sort()
    .map((f) => path.resolve(modelDir, f));

  if (files.length === 0) {
    throw new Error(
      `No model files found in ${modelDir}.\n` +
      `Create at least one .ts file that exports a createModelDefinition() value.`,
    );
  }

  const models: ModelDefinition[] = [];

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
      `No ModelDefinition exports found in ${modelDir}.\n` +
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
function isModelDefinition(value: unknown): value is ModelDefinition {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as ModelDefinition)._tableName === "string" &&
    typeof (value as ModelDefinition).toTableSchema === "function"
  );
}
