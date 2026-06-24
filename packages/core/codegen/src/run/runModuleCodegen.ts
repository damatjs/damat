import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import type { ModuleSchema } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import { getLogger } from "@damatjs/logger";
import { generateFilesMap } from "@/generator";
import {
  generateCrudScaffold,
  resolveServiceClassName,
  registryAugmentation,
  type ScaffoldAliases,
} from "@/scaffold";
import { generateBarrels } from "@/barrel";

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
    logger: ILogger,
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
    routesRoot,
    workflowsRoot,
    aliases,
  } = options;

  // 1. Row types + zod schemas.
  const filesMap = generateFilesMap(schema, {}, logger);

  // 2. Optional augmentation (app-mode injects cross-module link fields).
  if (options.augmentFilesMap) {
    await options.augmentFilesMap(filesMap, logger);
  }

  // 3. Write the type files.
  if (!existsSync(typesDir)) mkdirSync(typesDir, { recursive: true });
  const files: string[] = [];
  for (const [fileName, content] of filesMap) {
    writeFileSync(join(typesDir, fileName), content, "utf-8");
    files.push(fileName);
  }

  // 4. Registry augmentation so `getModule("<id>")` is typed. Written BEFORE the
  //    scaffold so a scaffold hiccup can never skip it.
  const serviceClass = resolveServiceClassName(serviceDir, moduleId);
  const serviceImport = aliases ? `${aliases.module}/service` : "../service";
  writeFileSync(
    join(typesDir, "registry.ts"),
    registryAugmentation(moduleId, serviceClass, serviceImport),
    "utf-8",
  );
  files.push("registry.ts");

  // 5. Per-operation CRUD scaffold (scaffold-once). Non-fatal: a failure here
  //    must not lose the already-written types/registry.
  let scaffolded: string[] = [];
  try {
    scaffolded = generateCrudScaffold(
      schema,
      {
        moduleId,
        routesRoot,
        workflowsRoot,
        typesDir,
        ...(aliases ? { aliases } : {}),
      },
      logger,
    ).created;
  } catch (e) {
    logger.warn(
      `CRUD scaffold skipped: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // 6. Recursive barrels so the bare `@workflows` re-exports the whole tree. Run
  //    over this module's workflow root; the cross-module app root barrel
  //    (src/workflows/index.ts) is rebuilt by the codegen command / module add.
  //    Non-fatal — barrels are mechanical and never block the type output.
  try {
    generateBarrels(workflowsRoot, logger);
  } catch (e) {
    logger.warn(
      `Barrel generation skipped: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  return { outputDir: typesDir, files, scaffolded };
}
