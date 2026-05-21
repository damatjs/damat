import fs from "node:fs";
import path from "node:path";
import type { Command, CommandContext, CommandResult } from "../../types";
import { generateTypes } from "@damatjs/orm-codegen";
import { ModuleSchema } from "@damatjs/orm-type";
import { resolveTypesPath, resolveModelsPath } from "../../utils/paths";

const generateTypesCommand: Command = {
  name: "generate:types",
  description: "Generate TypeScript types for a module",
  usage: "generate:types <module> [--output <path>]",
  examples: ["generate:types user", "generate:types user --output ./custom/path"],
  handler: async (ctx: CommandContext): Promise<CommandResult> => {
    const moduleName = ctx.args[0];
    const { config } = ctx.options;


    if (!moduleName) {
      printUsage(ctx);
      return { exitCode: 1 };
    }


    if (!config) {
      ctx.logger.error("config is required to be setup");
      console.log("");
      console.log("Usage: damat-orm migrate:create <module>");
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

      const schema = await loadSchema(module.resolve, ctx);
      if (!schema) return { exitCode: 1 };

      const typesContent = generateTypes(schema);
      const outputPath = resolveTypesPath(module.resolve);

      writeTypesFile(outputPath, typesContent);

      ctx.logger.success(`Types generated successfully`);
      console.log(`  Output: ${outputPath}`);

      return { exitCode: 0 };
    } catch (error) {
      ctx.logger.error(`Failed to generate types: ${error instanceof Error ? error.message : error}`);
      return { exitCode: 1 };
    }
  },
};

async function loadSchema(
  moduleResolver: string,
  ctx: CommandContext
): Promise<ModuleSchema | null> {
  const schemaPath = path.join(moduleResolver, "schema.json");

  if (!fs.existsSync(schemaPath)) {
    ctx.logger.error(`Schema file not found: ${schemaPath}`);
    console.log("");
    console.log("Make sure you have a schema.json file in your module directory.");
    return null;
  }

  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  return JSON.parse(schemaContent);
}

function writeTypesFile(outputPath: string, content: string): void {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, content, "utf-8");
}

function printUsage(ctx: CommandContext): void {
  ctx.logger.error("Module name is required");
  console.log("");
  console.log("Usage: damat-orm generate:types <module> [--output <path>]");
  console.log("");
  console.log("Examples:");
  console.log("  damat-orm generate:types user");
  console.log("  damat-orm generate:types user --output ./custom/path");
}

export default generateTypesCommand;
