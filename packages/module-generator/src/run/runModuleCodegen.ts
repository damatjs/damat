import type { ModuleSchema } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import { getLogger } from "@damatjs/logger";
import {
  generateFilesMap,
  type GenerationLogger,
} from "@damatjs/schema-codegen";
import type { ScaffoldAliases } from "@/scaffold";
import { writeGeneratedOutput } from "./writeOutput";
import { scaffoldOutput } from "./scaffoldOutput";

/**
 * The one orchestration both codegen entry points share. It is fully agnostic:
 * it takes a built `ModuleSchema` and **resolved paths** — it never reads
 * `module.json`, `damat.config.ts`, or any project layout. Callers resolve
 * their own manifest/config into these inputs.
 */
export interface RunModuleCodegenOptions {
  /** The schema to generate from (built by the caller via `toModuleSchema`). */
  schema: ModuleSchema;
  /** Module id — used for the registry augmentation + scaffold step/route names. */
  moduleId: string;
  /** Directory the generated types + `registry.ts` are written to. */
  typesDir: string;
  /** Directory containing `service.ts` (for the registry's service-class name). */
  serviceDir: string;
  /** Optional registry import override (for immutable package entries). */
  serviceImport?: string;
  /** Resolved module entry used to derive immutable package service types. */
  moduleTypeImport?: string;
  /** Directory under which `<resource>/` route folders are scaffolded. */
  routesRoot: string;
  /** Directory under which `<resource>/{steps,workflows}` are scaffolded. */
  workflowsRoot: string;
  /**
   * Portable import aliases for the scaffold + registry. When set, generated
   * files reach types/service via `@<id>/...` and reach workflows from the bare
   * `@workflows` barrel root (workflow→step stays a relative sibling), so the
   * imports survive the standalone→installed move unchanged.
   */
  aliases?: ScaffoldAliases;
  /**
   * Optional hook to mutate the generated files map before it is written —
   * e.g. app-mode weaves in cross-module link fields. Module-mode passes none.
   */
  augmentFilesMap?: (
    filesMap: Map<string, string>,
    logger: GenerationLogger,
  ) => void | Promise<void>;
}

export interface RunModuleCodegenResult {
  /** Where the types were written. */
  outputDir: string;
  /** Type/zod/registry files written this run. */
  files: string[];
  /** CRUD scaffold files newly created this run (scaffold-once). */
  scaffolded: string[];
}

export async function runModuleCodegen(
  options: RunModuleCodegenOptions,
  loggerData?: ILogger,
): Promise<RunModuleCodegenResult> {
  const logger = loggerData ?? getLogger();
  const {
    schema,
    moduleId,
    typesDir,
    serviceDir,
    aliases,
    serviceImport,
    moduleTypeImport,
  } = options;

  // 1. Row types + zod schemas.
  const filesMap = generateFilesMap(schema, {}, logger);

  // 2. Optional augmentation (app-mode injects cross-module link fields).
  if (options.augmentFilesMap) {
    await options.augmentFilesMap(filesMap, logger);
  }

  const registryImport =
    serviceImport ?? (aliases ? `${aliases.module}/service` : "../service");
  const files = writeGeneratedOutput({
    filesMap,
    typesDir,
    moduleId,
    serviceDir,
    serviceImport: registryImport,
    ...(moduleTypeImport && { moduleTypeImport }),
  });
  const scaffolded = scaffoldOutput(options, logger);

  return { outputDir: typesDir, files, scaffolded };
}
