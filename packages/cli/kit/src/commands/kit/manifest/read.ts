import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { KIT_MANIFEST_FILENAME, type KitManifest } from "./types";
import { kitManifestErrors } from "./validate";

export function readKitManifest(kitDir: string): KitManifest {
  const path = join(kitDir, KIT_MANIFEST_FILENAME);
  if (!existsSync(path)) {
    throw new Error(`${KIT_MANIFEST_FILENAME} not found in ${kitDir} — a kit must describe itself (run \`damat kit init\` in the source project)`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf-8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${KIT_MANIFEST_FILENAME} is not valid JSON: ${message}`);
  }
  const errors = kitManifestErrors(raw);
  if (errors.length) {
    throw new Error(`${KIT_MANIFEST_FILENAME} is invalid:\n  - ${errors.join("\n  - ")}`);
  }
  return raw as KitManifest;
}
