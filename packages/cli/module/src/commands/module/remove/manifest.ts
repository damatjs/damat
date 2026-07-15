import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MODULE_MANIFEST_FILENAME, type ModuleManifest } from "@damatjs/module";

export function readInstalledManifest(
  moduleHome: string,
): ModuleManifest | null {
  const manifestPath = join(moduleHome, MODULE_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8")) as ModuleManifest;
  } catch {
    return null;
  }
}

export function findDependents(
  cwd: string,
  modulesDir: string,
  moduleId: string,
): string[] {
  const root = join(cwd, modulesDir);
  if (!existsSync(root)) return [];
  const dependents: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === moduleId) continue;
    const manifest = readInstalledManifest(join(root, entry.name));
    if (manifest?.modules?.includes(moduleId)) dependents.push(entry.name);
  }
  return dependents;
}
