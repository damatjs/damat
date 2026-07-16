import type {
  GeneratedFilesMap,
  GenerationLogger,
  GenerateTypesOptions,
} from "@damatjs/schema-codegen";
import type {
  CrudNames,
  CrudScaffoldOptions,
  CrudScaffoldResult,
  GenerateBarrelsResult,
  RunCodegenOptions,
  RunModuleCodegenOptions,
  RunModuleCodegenResult,
  ScaffoldAliases,
} from "@damatjs/module-generator";
import type {
  CrudNames as LegacyCrudNames,
  CrudScaffoldOptions as LegacyCrudScaffoldOptions,
  CrudScaffoldResult as LegacyCrudScaffoldResult,
  GeneratedFilesMap as LegacyGeneratedFilesMap,
  GenerationLogger as LegacyGenerationLogger,
  GenerateBarrelsResult as LegacyGenerateBarrelsResult,
  GenerateTypesOptions as LegacyGenerateTypesOptions,
  RunCodegenOptions as LegacyRunCodegenOptions,
  RunModuleCodegenOptions as LegacyRunModuleCodegenOptions,
  RunModuleCodegenResult as LegacyRunModuleCodegenResult,
  ScaffoldAliases as LegacyScaffoldAliases,
} from "../types";

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type LegacyTypesMatchOwners = [
  Assert<Same<LegacyGeneratedFilesMap, GeneratedFilesMap>>,
  Assert<Same<LegacyGenerationLogger, GenerationLogger>>,
  Assert<Same<LegacyGenerateTypesOptions, GenerateTypesOptions>>,
  Assert<Same<LegacyCrudNames, CrudNames>>,
  Assert<Same<LegacyCrudScaffoldOptions, CrudScaffoldOptions>>,
  Assert<Same<LegacyCrudScaffoldResult, CrudScaffoldResult>>,
  Assert<Same<LegacyGenerateBarrelsResult, GenerateBarrelsResult>>,
  Assert<Same<LegacyRunCodegenOptions, RunCodegenOptions>>,
  Assert<Same<LegacyRunModuleCodegenOptions, RunModuleCodegenOptions>>,
  Assert<Same<LegacyRunModuleCodegenResult, RunModuleCodegenResult>>,
  Assert<Same<LegacyScaffoldAliases, ScaffoldAliases>>,
];

export const legacyLoggerCallback: NonNullable<
  LegacyRunModuleCodegenOptions["augmentFilesMap"]
> = (_files, logger) => {
  logger.warn("legacy callback warning");
  logger.error("legacy callback error");
};
