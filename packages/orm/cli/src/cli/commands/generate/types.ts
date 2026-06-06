import { OrmModuleContainer } from "@/cli/types";
import { resolveModelsPath, resolveTypesPath } from "@/cli/utils";
import { loadModules } from "@/cli/utils/load";
import { type Command } from "@damatjs/cli";

const generateTypes: Command = {
  name: "generate:types",
  description: "Generate TypeScript types for a module",
  handler: async (ctx) => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { generateFilesMap } = await import("@damatjs/orm-codegen");
    const { toModuleSchema } = await import("@damatjs/orm-model");
    const { discoverModels } = await import("@damatjs/orm-migration");
    const moduleName = ctx.args[0];

    if (!moduleName) {
      ctx.logger.error("Module name is required");
      return { exitCode: 1 };
    }

    // Load modules from damat.config.ts
    let modules: OrmModuleContainer;
    try {
      modules = await loadModules("damat.config.ts", ctx.cwd);
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

    // Verify models directory exists
    const resolvedModelsDir = resolveModelsPath(moduleConfig.resolve);
    if (!fs.existsSync(resolvedModelsDir)) {
      ctx.logger.error(`Models directory not found: ${resolvedModelsDir}`);
      return { exitCode: 1 };
    }

    try {
      ctx.logger.info(`Generating types for module '${moduleName}'...`);

      const models = await discoverModels(moduleConfig.resolve);

      // Build the ModuleSchema from model definitions
      const schema = toModuleSchema(moduleName, models);

      // Generate a file-per-table map  (includes index.ts + per-table files)
      const filesMap = generateFilesMap(schema, {}, ctx.logger);

      // Write every generated file to {moduleResolver}/types/
      const outputDir = resolveTypesPath(moduleConfig.resolve);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      for (const [fileName, content] of filesMap) {
        const outputPath = path.join(outputDir, fileName);
        fs.writeFileSync(outputPath, content, "utf-8");
      }

      ctx.logger.info(`Output: ${outputDir}`);
      ctx.logger.info(`Files: ${Array.from(filesMap.keys()).join(", ")}`);
      ctx.logger.success("Types generated successfully");

      return { exitCode: 0 };
    } catch (error) {
      ctx.logger.error(
        `Failed to generate types: ${error instanceof Error ? error.message : error}`,
      );
      return { exitCode: 1 };
    }
  },
};

export default generateTypes;
