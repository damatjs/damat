import type { ILogger } from "@damatjs/logger";
import { discoverModels } from "@damatjs/orm-migration";
import { toModuleSchema } from "@damatjs/orm-model";
import {
  runModuleCodegen,
  type RunModuleCodegenOptions,
  type RunModuleCodegenResult,
} from "./runModuleCodegen";

/**
 * Provider-driven convenience over `runModuleCodegen`: discovers models from
 * an aggregate export or a directory of model files, builds the schema, then
 * runs the shared codegen.
 */
export interface RunCodegenOptions extends Omit<
  RunModuleCodegenOptions,
  "schema"
> {
  /**
   * Models provider file/directory. Directories may contain an aggregate index
   * or individual files exporting model definitions.
   */
  moduleResolver: string;
}

export async function runCodegen(
  options: RunCodegenOptions,
  logger?: ILogger,
): Promise<RunModuleCodegenResult> {
  const { moduleResolver, ...rest } = options;
  const models = await discoverModels(moduleResolver, logger);
  const schema = toModuleSchema(rest.moduleId, models);
  return runModuleCodegen({ schema, ...rest }, logger);
}
