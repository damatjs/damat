import { dirname, relative } from "node:path";
import type { ModuleEntry } from "./constant";
import { entryPath, typesPath } from "./constant";

export function codegenPaths(
  module: ModuleEntry,
  cwd: string,
  moduleId: string,
) {
  const entry = entryPath(module);
  const typesDir = typesPath(module, cwd, moduleId);
  const serviceImport =
    module.mutable === false ? relativeImport(typesDir, entry) : undefined;
  return {
    entry,
    models: module.models ?? entry,
    typesDir,
    serviceDir: module.entry ? dirname(entry) : module.resolve,
    ...(serviceImport && { moduleTypeImport: serviceImport }),
  };
}

function relativeImport(from: string, to: string): string {
  const path = relative(from, to)
    .split("\\")
    .join("/")
    .replace(/\.(?:ts|js)$/, "");
  return path.startsWith(".") ? path : `./${path}`;
}
