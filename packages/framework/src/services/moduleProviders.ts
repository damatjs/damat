import { statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ResolvedModule } from "@damatjs/installer";

const PROVIDERS = ["workflows", "jobs", "events", "pipelines"] as const;

function providerEntry(path: string): string {
  if (!statSync(path).isDirectory()) return path;
  for (const file of ["index.ts", "index.js"]) {
    const entry = join(path, file);
    try {
      if (statSync(entry).isFile()) return entry;
    } catch {
      // try the next conventional entry
    }
  }
  throw new Error(`Provider directory has no index.ts or index.js: ${path}`);
}

export async function loadModuleProviders(
  modules: Map<string, ResolvedModule>,
): Promise<void> {
  for (const [id, module] of modules) {
    for (const provider of PROVIDERS) {
      const path = module[provider];
      if (!path) continue;
      try {
        await import(pathToFileURL(providerEntry(path)).href);
      } catch (error) {
        throw new Error(
          `Failed to load ${provider} provider for "${id}": ${String(error)}`,
        );
      }
    }
  }
}
