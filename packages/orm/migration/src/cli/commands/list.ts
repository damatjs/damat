/**
 * List Command
 *
 * List all modules with migrations.
 */

import type { CliOptions } from "../../types";
import { discoverAllMigrations } from "../../discovery";
import { DEFAULT_MODULES_DIR } from "../../generator";
import type { CommandResult } from "./types";

/**
 * List all modules with migrations.
 */
export async function commandList(options: CliOptions): Promise<CommandResult> {
  const { modules } = options;
  const modulesDir = options.modulesDir ?? DEFAULT_MODULES_DIR;

  console.log("");
  console.log("Modules with migrations:");
  console.log("");

  if (modules) {
    const allMigrations = discoverAllMigrations(modulesDir, modules);
    const moduleMap = new Map<string, number>();

    for (const m of allMigrations) {
      moduleMap.set(m.module, (moduleMap.get(m.module) ?? 0) + 1);
    }

    if (moduleMap.size === 0) {
      console.log("  No modules with migrations found.");
    } else {
      for (const [mod, count] of [...moduleMap.entries()].sort()) {
        console.log(`  - ${mod} (${count} migration${count > 1 ? "s" : ""})`);
      }
    }
  }
  console.log("");
  return { exitCode: 0 };
}
