import path from "node:path";

export { DEFAULT_MODULES_DIR } from "./base";
export { resolveModelsPath } from "./models";
export { resolveMigrationsPath } from "./migrations";
export { resolveTypesPath } from "./types";

export interface ResolvedPaths {
  modelsDir: string;
  migrationsDir: string;
  typesDir: string;
  modulesDir: string;
}

export function resolvePaths(
  moduleResolver: string
): ResolvedPaths {

  return {
    modulesDir: moduleResolver,
    modelsDir: path.join(moduleResolver, "models"),
    migrationsDir: path.join(moduleResolver, "migrations"),
    typesDir: path.join(moduleResolver, "types", "common"),
  };
}
