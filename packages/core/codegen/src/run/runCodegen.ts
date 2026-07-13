import type { ILogger } from "@damatjs/logger";
import { discoverModels } from "@damatjs/orm-migration";
import { toModuleSchema } from "@damatjs/orm-model";
import {
  runModuleCodegen,
  type RunModuleCodegenOptions,
  type RunModuleCodegenResult,
} from "./runModuleCodegen";

/**
 * Dir-driven convenience over `runModuleCodegen`: discovers the module's models
 * (by importing `moduleResolver` and reading its `models` export), builds the
 * schema, then runs the shared codegen. Still agnostic — the caller resolves the
 * `moduleResolver` and output paths from whatever manifest/config it uses.
 */
export interface RunCodegenOptions extends Omit<
  RunModuleCodegenOptions,
  "schema"
> {
  /**
   * Path that exports `models` (a module dir whose `index.ts` re-exports it, or
   * the entry file). Passed straight to `discoverModels`.
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
