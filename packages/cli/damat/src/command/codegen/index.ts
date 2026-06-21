import { join } from "node:path";
import { existsSync } from "node:fs";
import type { Command } from "@damatjs/cli";
import { loadModules } from "@damatjs/orm-cli";
import { runCodegen } from "@damatjs/codegen";
import { augmentWithLinks } from './augmentWithLinks';
import { ModuleContainer, modelsPath, typesPath } from './constant';

/**
 * App-mode codegen: for a module declared in `damat.config.ts`, generate its
 * row types + zod + registry, weave in cross-module link fields, and scaffold
 * the CRUD slice. Resolution (config, paths, links) lives here; the actual
 * generation is the shared, agnostic `@damatjs/codegen` core. The api/router
 * layout is your choice via `--api-layout`: `flat` (default) dumps just the
 * models at `src/api/routes/<table>`; `module` groups them at
 * `src/api/routes/<module>/<table>`. Workflows always group under
 * `src/workflows/<module>`.
 */
export const codegenCommand: Command = {
  name: "codegen",
  description: "Generate types + zod + registry + CRUD scaffold for an app module",
  usage: "damat codegen <module> [--flat]",
  examples: ["damat codegen user", "damat codegen user"],
  options: [
    {
      name: "flat",
      alias: "flat",
      type: "boolean",
      description:
        "api/router folder layout flat: 'true' (src/api/routes/<table>) or 'false' (src/api/routes/<module>/<table>, default)",
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
    const moduleConfig = modules[moduleName];
    if (!moduleConfig) {
      ctx.logger.error(`Module '${moduleName}' not found in config`);
      return { exitCode: 1 };
    }
    // Link modules don't generate their own types — the linked modules surface
    // the fields. Skip cleanly.
    if (moduleConfig.kind === "link") {
      ctx.logger.info(
        `'${moduleName}' is a link module; run codegen for the linked modules instead.`,
      );
      return { exitCode: 0 };
    }
    if (!existsSync(modelsPath(moduleConfig.resolve))) {
      ctx.logger.error(
        `Models directory not found: ${modelsPath(moduleConfig.resolve)}`,
      );
      return { exitCode: 1 };
    }

    // api/router layout: `flat` dumps just the models (src/api/routes/<table>);
    // `module` groups them under the module (src/api/routes/<module>/<table>).
    const flat = ctx.options.flat;

    const apiRoutesBase = join(ctx.cwd, "src", "api", "routes");
    const routesRoot =
      !flat ? join(apiRoutesBase, moduleName) : apiRoutesBase;

    try {
      ctx.logger.info(
        `Generating codegen for module '${moduleName}' (api-layout: ${flat ? "module" : "flat"})...`,
      );
      const typesDir = typesPath(moduleConfig.resolve);
      const result = await runCodegen(
        {
          moduleResolver: moduleConfig.resolve,
          moduleId: moduleName,
          serviceDir: moduleConfig.resolve,
          typesDir,
          routesRoot,
          workflowsRoot: join(ctx.cwd, "src", "workflows", moduleName),
          augmentFilesMap: (filesMap) =>
            augmentWithLinks(
              { modules, moduleName, typesDir, logger: ctx.logger },
              filesMap,
            ),
        },
        ctx.logger,
      );

      ctx.logger.info(`Output: ${result.outputDir}`);
      ctx.logger.info(`Files: ${result.files.join(", ")}`);
      if (result.scaffolded.length > 0) {
        ctx.logger.success(
          `Scaffolded ${result.scaffolded.length} CRUD files (steps, workflows, routes)`,
        );
      }
      ctx.logger.success("Codegen completed");
      return { exitCode: 0 };
    } catch (error) {
      ctx.logger.error(
        `Codegen failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exitCode: 1 };
    }
  },
};


export default codegenCommand;
