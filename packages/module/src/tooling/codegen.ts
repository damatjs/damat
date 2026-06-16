import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { generateFilesMap } from "@damatjs/orm-codegen";
import { toModuleSchema } from "@damatjs/orm-model";
import { discoverModels } from "@damatjs/orm-migration";
import type { ILogger } from "@damatjs/logger";
import { readModuleManifest } from "../manifest/read";
import { DEFAULT_MODULE_PATHS } from "../manifest/types";
import { locateModuleDir } from "../runtime/locate";

export interface ModuleCodegenResult {
  outputDir: string;
  files: string[];
}

/**
 * Generate TypeScript row types + zod schemas for a standalone module
 * package — no damat.config.ts required.
 */
export async function generateModuleTypes(
  packageDir: string,
  logger: ILogger,
): Promise<ModuleCodegenResult> {
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);

  const models = await discoverModels(moduleDir);
  const schema = toModuleSchema(manifest.name, models);
  const filesMap = generateFilesMap(schema, {}, logger);

  const outputDir = join(
    moduleDir,
    manifest.paths?.types ?? DEFAULT_MODULE_PATHS.types,
  );
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const files: string[] = [];
  for (const [fileName, content] of filesMap) {
    writeFileSync(join(outputDir, fileName), content, "utf-8");
    files.push(fileName);
  }

  return { outputDir, files };
}
