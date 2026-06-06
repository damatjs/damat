import { ILogger } from "@damatjs/logger";
import type { ModelDefinition } from "@damatjs/orm-model";

export async function discoverModels(
  moduleResolver: string,
  logger?: ILogger,
): Promise<ModelDefinition[]> {
  const value = await import(moduleResolver);
  const models: ModelDefinition[] = Object.values(value.models);

  if (models.length === 0) {
    logger?.error(
      `No Model has been defined in ${moduleResolver}, consider importing models in the module service`,
    );
    throw new Error(
      `No Model has been defined in ${moduleResolver}, consider importing models in the module service`,
    );
  }
  logger?.info(`Discovered ${models.length} model(s) from services directory`);
  return models;
}
