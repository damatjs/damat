import { parseDamatManifest, type DamatManifest } from "@damatjs/installer";
import type { ModuleManifest, ModuleManifestPaths } from "./types";
import { validateModuleManifest } from "./validate";

const PATH_KEYS: Array<keyof ModuleManifestPaths> = [
  "entry", "models", "migrations", "routes", "workflows", "jobs", "events",
  "pipelines", "links", "tests", "types",
];

function modulePaths(metadata: Record<string, unknown>): ModuleManifestPaths {
  return Object.fromEntries(
    PATH_KEYS.filter((key) => metadata[key] !== undefined)
      .map((key) => [key, metadata[key]]),
  );
}

export function normalizeDamatModule(input: unknown): ModuleManifest {
  const manifest: DamatManifest = parseDamatManifest(input);
  if (manifest.kind !== "module") throw new Error("damat.json kind must be module");
  const metadata = manifest.module ?? {};
  const paths = modulePaths(metadata);
  return validateModuleManifest({
    name: manifest.name,
    ...(manifest.version && { version: manifest.version }),
    ...(metadata.description !== undefined && { description: metadata.description }),
    ...(metadata.author !== undefined && { author: metadata.author }),
    ...(metadata.env !== undefined && { env: metadata.env }),
    ...(manifest.install?.packages && { packages: manifest.install.packages }),
    ...(metadata.modules !== undefined && { modules: metadata.modules }),
    ...(metadata.pairsWith !== undefined && { pairsWith: metadata.pairsWith }),
    ...(Object.keys(paths).length && { paths }),
    ...(metadata.registry !== undefined && { registry: metadata.registry }),
  });
}
