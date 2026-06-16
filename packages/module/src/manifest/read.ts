import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { MODULE_MANIFEST_FILENAME } from "./constants";
import { validateModuleManifest } from "./validate";
import type { ModuleManifest } from "./types";

/** Read and validate module.json from a module directory */
export function readModuleManifest(moduleDir: string): ModuleManifest {
  const manifestPath = join(moduleDir, MODULE_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `No ${MODULE_MANIFEST_FILENAME} found in ${moduleDir} — not a damat module`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch (e) {
    throw new Error(
      `Invalid JSON in ${manifestPath}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  return validateModuleManifest(parsed);
}
