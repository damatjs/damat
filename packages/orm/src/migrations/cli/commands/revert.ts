/**
 * Revert Command
 *
 * Revert migrations for a specific module.
 */

import { MikroORM } from "@damatjs/deps/mikro-orm/postgresql";
import type { CliOptions } from "../../../types";
import { revertMigrations } from "../../executor";
import { listModulesWithMigrations } from "../../discovery";
import { successBanner, errorBanner } from "../../logger";
import type { CommandResult } from "./types";

/**
 * Revert migrations for a module.
 */
export async function commandRevert(
  options: CliOptions,
  args: string[],
): Promise<CommandResult> {
  const { ormConfig, modulesDir, activeModules } = options;

  const moduleName = args.find((a) => !a.startsWith("--"));
  const allFlag = args.includes("--all");
  const countArg = args.find((a) => /^\d+$/.test(a));

  if (!moduleName) {
    console.error("\x1b[31mError: Module name is required\x1b[0m");
    console.error("");
    console.error("Usage: npm run db:migrate:revert <module> [count] [--all]");
    console.error("");
    console.error("Modules with migrations:");

    const modules = listModulesWithMigrations(modulesDir, activeModules);
    if (modules.length > 0) {
      for (const m of modules) {
        console.error(`  - ${m}`);
      }
    } else {
      console.error("  (no modules found)");
    }

    return { exitCode: 1 };
  }

  console.log("");
  console.log(`Reverting migrations for module '${moduleName}'...`);
  console.log("");

  const orm = await MikroORM.init(ormConfig);
  const count = allFlag ? 9999 : countArg ? parseInt(countArg, 10) : 1;
  const result = await revertMigrations(orm, modulesDir, moduleName, count);

  console.log("");

  if (result.success) {
    successBanner("Revert completed successfully");
    console.log(`  Reverted: ${result.reverted.length}`);
  } else {
    errorBanner("Revert failed");
  }

  return { exitCode: result.success ? 0 : 1, orm };
}
