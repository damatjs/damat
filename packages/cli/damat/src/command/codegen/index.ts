import type { Command } from "@damatjs/cli";
import { loadModules } from "@damatjs/orm-cli";
import { ModuleContainer } from "./constant";
import { codegenAll } from './codegen/all';
import { codegenOne } from './codegen/one';

/**
 * App-mode codegen. For each app module declared in `damat.config.ts`, generate
 * its row types + zod + registry, weave in cross-module link fields, and
 * scaffold the CRUD slice.
 *
 * - `damat codegen <module>` — just that module; a missing models directory is
 *   a hard error.
 *
 * api/router layout: by DEFAULT routes group under the module
 * (`src/api/routes/<module>/<table>`). Pass `--flat` to dump just the models,
 * left alone (`src/api/routes/<table>`). Workflows always group under
 * `src/workflows/<module>`.
 */
export const codegenCommand: Command = {
  name: "codegen",
  description: "Generate types + zod + registry + CRUD scaffold for app modules",
  usage: "damat codegen [module] [--flat]",
  examples: ["damat codegen", "damat codegen user", "damat codegen user --flat"],
  options: [
    {
      name: "flat",
      alias: "f",
      type: "boolean",
      description:
        "Dump routes flat at src/api/routes/<table> instead of grouping under the module (src/api/routes/<module>/<table>, the default)",
      default: false,
    },
  ],
  handler: async (ctx) => {
    const moduleName = ctx.args[0];
    if (!moduleName) {
      ctx.logger.error("Module name is required: damat codegen <module>");
      return { exitCode: 1 };
    }

    let modules: ModuleContainer;
    try {
      modules = await loadModules<ModuleContainer>("damat.config.ts", ctx.cwd);
    } catch (error) {
      ctx.logger.error(
        `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exitCode: 1 };
    }
    if (!modules || Object.keys(modules).length === 0) {
      ctx.logger.error("No modules found in 'damat.config.ts'");
      return { exitCode: 1 };
    }

    // Targeted: `damat codegen <module>`.
    if (moduleName) {
      return codegenOne(ctx, modules, moduleName);
    }

    // Whole-app: `damat codegen` — every module in the config.
    return codegenAll(ctx, modules);
  },
};


export default codegenCommand;

//  * Two modes:
//  * - `damat codegen` — every non-link module in the config. Modules without a
//  *   models directory are skipped with a warning so one stray entry can't abort
//  *   the rest.