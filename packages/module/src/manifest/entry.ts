import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ModuleManifest } from "./types";

const CONVENTIONAL_ENTRIES = [
  "./index.ts",
  "./index.js",
  "./src/index.ts",
  "./src/index.js",
] as const;

export function resolveModuleEntry(
  moduleDir: string,
  manifest: ModuleManifest,
): string {
  const entries = manifest.paths?.entry
    ? [manifest.paths.entry]
    : CONVENTIONAL_ENTRIES;
  for (const entry of entries) {
    const path = join(moduleDir, entry);
    if (existsSync(path)) return path;
  }
  const [first, ...rest] = entries;
  const alternatives = rest.length
    ? `; also checked ${rest.map((entry) => `"${entry}"`).join(", ")}`
    : "";
  throw new Error(
    `Entry "${first}" not found${alternatives} (must default-export defineModule(...))`,
  );
}
