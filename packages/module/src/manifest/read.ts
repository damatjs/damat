import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { MODULE_MANIFEST_FILENAME } from "./constants";
import { DAMAT_MANIFEST_FILENAME } from "@damatjs/installer";
import { normalizeDamatModule } from "./damat";
import { validateModuleManifest } from "./validate";
import type { ModuleManifest } from "./types";

/** Read damat.json, falling back to the legacy module.json contract. */
export function readModuleManifest(moduleDir: string): ModuleManifest {
  const universalPath = join(moduleDir, DAMAT_MANIFEST_FILENAME);
  const manifestPath = existsSync(universalPath)
    ? universalPath
    : join(moduleDir, MODULE_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `No damat.json or ${MODULE_MANIFEST_FILENAME} found in ${moduleDir} — not a damat module`,
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
  return manifestPath === universalPath
    ? normalizeDamatModule(parsed)
    : validateModuleManifest(parsed);
}
