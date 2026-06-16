import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { appDir } from "../env";

/** List installed modules by scanning the app's modules directory. */
export function listInstalled(dir: string): Array<Record<string, unknown>> {
  const modulesDir = join(appDir(), dir);
  if (!existsSync(modulesDir)) return [];
  const out: Array<Record<string, unknown>> = [];
  for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = join(modulesDir, entry.name, "module.json");
    let version: string | undefined;
    let description: string | undefined;
    if (existsSync(manifestPath)) {
      try {
        const m = JSON.parse(readFileSync(manifestPath, "utf-8"));
        version = m.version;
        description = m.description;
      } catch {
        description = "(invalid module.json)";
      }
    } else {
      description = "(no module.json)";
    }
    out.push({ id: entry.name, version, description });
  }
  return out;
}
