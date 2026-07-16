import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { ModuleResolveLocation } from "../config";

function damatImport(path: string, cwd: string): string {
  if (isAbsolute(path) || path.includes("\\"))
    throw new Error("Damat module path must stay inside .damat/packages");
  const root = resolve(cwd, ".damat/packages");
  const target = resolve(root, path);
  const offset = relative(root, target);
  if (offset.startsWith("..") || isAbsolute(offset))
    throw new Error("Damat module path must stay inside .damat/packages");
  return pathToFileURL(target).href;
}

export function resolveModuleImport(
  location: ModuleResolveLocation,
  cwd: string,
): string {
  if (typeof location === "string")
    return pathToFileURL(resolve(cwd, location)).href;
  if (location.type === "package") {
    if (!location.name.trim()) throw new Error("package module name is required");
    return location.name;
  }
  return damatImport(location.path, cwd);
}

export function moduleLocationId(location: ModuleResolveLocation): string {
  if (typeof location === "string") return location.split("/").at(-1)!;
  return location.type === "package"
    ? location.name.split("/").at(-1)!
    : location.path.split("/")[0]!;
}
