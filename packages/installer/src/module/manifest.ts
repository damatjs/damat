import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DAMAT_MANIFEST_FILENAME } from "../schema";
import { normalizeDamatModule, validateLegacyModule } from "./normalize";
import type { LocatedModuleManifest } from "./types";

const CANDIDATES = [
  DAMAT_MANIFEST_FILENAME,
  `src/${DAMAT_MANIFEST_FILENAME}`,
  "src/module.json",
  "module.json",
] as const;

export class ModuleManifestNotFoundError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function locateModuleManifest(root: string): LocatedModuleManifest {
  for (const candidate of CANDIDATES) {
    const path = join(root, candidate);
    if (!existsSync(path)) continue;
    let input: unknown;
    try {
      input = JSON.parse(readFileSync(path, "utf8"));
    } catch (error) {
      throw new Error(
        `Invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return {
      path,
      manifestDir: dirname(path),
      manifest: candidate.endsWith(DAMAT_MANIFEST_FILENAME)
        ? normalizeDamatModule(input)
        : validateLegacyModule(input),
    };
  }
  throw new ModuleManifestNotFoundError(
    `No damat.json or module.json found in ${root}`,
  );
}
