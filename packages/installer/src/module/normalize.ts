import { parseDamatManifest } from "../schema";
import type { ModuleManifest, ModuleManifestPaths } from "./types";

const PATHS: Array<keyof ModuleManifestPaths> = [
  "entry",
  "models",
  "migrations",
  "routes",
  "workflows",
  "jobs",
  "events",
  "pipelines",
  "links",
  "tests",
  "types",
];

export function validateLegacyModule(input: unknown): ModuleManifest {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("module.json must contain a JSON object");
  const value = input as Record<string, unknown>;
  if (typeof value.name !== "string" || !/^[a-z][a-z0-9-]*$/.test(value.name))
    throw new Error('module.json requires a kebab-case "name" field');
  if (
    value.paths !== undefined &&
    (!value.paths ||
      typeof value.paths !== "object" ||
      Array.isArray(value.paths))
  )
    throw new Error('module.json "paths" must be an object');
  return value as unknown as ModuleManifest;
}

export function normalizeDamatModule(input: unknown): ModuleManifest {
  const value = parseDamatManifest(input);
  if (value.kind !== "module")
    throw new Error("damat.json kind must be module");
  const metadata = value.module ?? {};
  const paths = Object.fromEntries(
    PATHS.filter((key) => metadata[key] !== undefined).map((key) => [
      key,
      metadata[key],
    ]),
  );
  return validateLegacyModule({
    name: value.name,
    ...(value.version && { version: value.version }),
    ...(metadata.description !== undefined && {
      description: metadata.description,
    }),
    ...(metadata.author !== undefined && { author: metadata.author }),
    ...(metadata.env !== undefined && { env: metadata.env }),
    ...(value.install?.packages && { packages: value.install.packages }),
    ...(metadata.modules !== undefined && { modules: metadata.modules }),
    ...(metadata.pairsWith !== undefined && { pairsWith: metadata.pairsWith }),
    ...(Object.keys(paths).length && { paths }),
    ...(metadata.registry !== undefined && { registry: metadata.registry }),
  });
}
