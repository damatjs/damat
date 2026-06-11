import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import type { ModuleManifest } from "@damatjs/module";

/**
 * Collect the npm packages a module needs in the host app:
 * the module package's own dependencies (minus the @damatjs/* stack the
 * host already provides) merged with manifest.packages overrides.
 */
export function collectModulePackages(
  packageRoot: string,
  manifest: ModuleManifest,
): Record<string, string> {
  const collected: Record<string, string> = {};

  const packageJsonPath = join(packageRoot, "package.json");
  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      for (const [name, range] of Object.entries(
        packageJson.dependencies ?? {},
      )) {
        if (name.startsWith("@damatjs/")) continue; // host provides the stack
        collected[name] = String(range);
      }
    } catch {
      // unreadable package.json — fall through to manifest.packages only
    }
  }

  for (const [name, range] of Object.entries(manifest.packages ?? {})) {
    collected[name] = range;
  }

  return collected;
}
