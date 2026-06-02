import type { Command } from "@damatjs/cli";

const generateTypes: Command = {
  name: "generate:types",
  description: "Generate TypeScript types for a module",
  handler: async (ctx) => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { generateTypes } = await import("@damatjs/orm-codegen");
    const { resolveTypesPath, resolveModelsPath } = await import("../../utils/paths/index.js");

    const moduleName = ctx.args[0];
    const config = ctx.options.config as Record<string, { resolve: string }> | undefined;

    if (!moduleName) {
      ctx.logger.error("Module name is required");
      return { exitCode: 1 };
    }
    if (!config || Object.keys(config).length === 0) {
      ctx.logger.error("Config is required. Make sure damat.config.ts exists.");
      return { exitCode: 1 };
    }

    const module = config[moduleName];
    if (!module) {
      ctx.logger.error(`Module '${moduleName}' not found in config`);
      return { exitCode: 1 };
    }

    const resolvedModelsDir = resolveModelsPath(config, module.resolve);
    if (!fs.existsSync(resolvedModelsDir)) {
      ctx.logger.error(`Models directory not found: ${resolvedModelsDir}`);
      return { exitCode: 1 };
    }

    try {
      ctx.logger.info(`Generating types for module '${moduleName}'...`);

      const schemaPath = path.join(module.resolve, "schema.json");
      if (!fs.existsSync(schemaPath)) {
        ctx.logger.error(`Schema file not found: ${schemaPath}`);
        return { exitCode: 1 };
      }

      const schemaContent = fs.readFileSync(schemaPath, "utf-8");
      const schema = JSON.parse(schemaContent);
      const typesContent = generateTypes(schema);
      const outputPath = resolveTypesPath(module.resolve);

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(outputPath, typesContent, "utf-8");

      ctx.logger.success("Types generated successfully");
      console.log(`  Output: ${outputPath}`);

      return { exitCode: 0 };
    } catch (error) {
      ctx.logger.error(`Failed to generate types: ${error instanceof Error ? error.message : error}`);
      return { exitCode: 1 };
    }
  },
};

export default generateTypes;
