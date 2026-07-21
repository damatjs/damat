import { existsSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { assertSafeRelativePath } from "../schema/path";
import type { ModuleArtifactLocation } from "./types";
import { inside } from "./path";

function nodePackageRoot(name: string, cwd: string): string {
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/.test(name))
    throw new Error(`invalid Node package name: ${name}`);
  let current = resolve(cwd);
  while (true) {
    const modulesDir = join(current, "node_modules");
    const candidate = join(modulesDir, name);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  throw new Error(`Node package module not found: ${name}`);
}

export function resolveArtifactRoot(
  location: ModuleArtifactLocation,
  cwd: string,
): { root: string; mutable: boolean; packageName?: string } {
  if (typeof location === "string")
    return { root: resolve(cwd, location), mutable: true };
  if (location.type === "package")
    return {
      root: nodePackageRoot(location.name, cwd),
      mutable: false,
      packageName: location.name,
    };
  const safe = assertSafeRelativePath(location.path, "Damat module path");
  const store = resolve(cwd, ".damat/packages");
  const root = resolve(store, safe);
  if (
    existsSync(store) &&
    existsSync(root) &&
    !inside(realpathSync(store), realpathSync(root))
  )
    throw new Error("Damat module path must stay inside .damat/packages");
  return { root, mutable: false };
}
