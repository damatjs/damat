import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ILogger } from "@damatjs/logger";
import type { ModelDefinition } from "@damatjs/orm-model";

const isModel = (value: unknown): value is ModelDefinition =>
  Boolean(
    value &&
    typeof value === "object" &&
    typeof (value as ModelDefinition)._tableName === "string",
  );

async function loadModels(path: string): Promise<ModelDefinition[]> {
  const value = await import(pathToFileURL(path).href);
  if (value.models && typeof value.models === "object")
    return Object.values(value.models) as ModelDefinition[];
  return Object.values(value).filter(isModel);
}

async function loadModelsDirectory(path: string): Promise<ModelDefinition[]> {
  for (const name of ["index.ts", "index.js"]) {
    const index = join(path, name);
    if (existsSync(index)) return loadModels(index);
  }
  const models: ModelDefinition[] = [];
  for (const name of readdirSync(path).sort()) {
    if (!/\.(?:ts|js)$/.test(name) || name.endsWith(".d.ts")) continue;
    models.push(...(await loadModels(join(path, name))));
  }
  return [...new Set(models)];
}

export async function discoverModels(
  moduleResolver: string,
  logger?: ILogger,
): Promise<ModelDefinition[]> {
  const models = statSync(moduleResolver).isDirectory()
    ? await loadModelsDirectory(moduleResolver)
    : await loadModels(moduleResolver);

  if (models.length === 0) {
    logger?.error(`No Model has been defined in ${moduleResolver}`);
    throw new Error(`No Model has been defined in ${moduleResolver}`);
  }
  logger?.info(`Discovered ${models.length} model(s) from models provider`);
  return models;
}
