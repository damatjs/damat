import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  runCodegen,
  type RunModuleCodegenResult,
} from "@damatjs/module-generator";
import type { ILogger } from "@damatjs/logger";
import { readModuleManifest } from "../manifest/read";
import { resolveModuleEntry } from "../manifest/entry";
import { DEFAULT_MODULE_PATHS } from "../manifest/types";
import { locateModuleDir } from "../runtime/locate";

export type ModuleCodegenResult = RunModuleCodegenResult;

/**
 * Generate a standalone module package's types + zod + registry + CRUD scaffold.
 *
 * This is a thin manifest resolver: it reads the module manifest to find its
 * paths, then hands **resolved inputs** to the shared, agnostic
 * `@damatjs/module-generator` core. Both trees are **flat by table** here
 * (`api/routes/<resource>` and `workflows/<resource>`) — a module is a
 * single-purpose blade and owns no module-id namespace. `damat module add` adds
 * the `<moduleId>/` segment when it relocates these into a host app
 * (`src/api/routes/<id>/<resource>`, `src/workflows/<id>/<resource>`). Generated
 * files reach types/service via `@<module>/*` and reach workflows through the
 * bare `@workflows` barrel root, so the imports resolve unchanged before and
 * after install.
 *
 * No `augmentFilesMap` hook is passed, so **no link augmentation runs in
 * module mode** — deliberately, even if the module ships dormant `src/links/`
 * files. Link augmentation needs the *target* module's types, which exist only
 * in a host app; the app's own codegen weaves them in after install (skipping
 * any link whose target module is absent). Do not add link processing here.
 */
export async function generateModuleTypes(
  packageDir: string,
  logger: ILogger,
): Promise<ModuleCodegenResult> {
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);
  const moduleId = manifest.name;
  const declaredModels = join(
    moduleDir,
    manifest.paths?.models ?? DEFAULT_MODULE_PATHS.models,
  );
  const moduleResolver = existsSync(declaredModels)
    ? declaredModels
    : moduleDir;
  const workflowsBase =
    manifest.paths?.workflows ?? DEFAULT_MODULE_PATHS.workflows;
  const routesBase = manifest.paths?.routes ?? DEFAULT_MODULE_PATHS.routes;

  return runCodegen(
    {
      moduleResolver,
      moduleId,
      serviceDir: dirname(resolveModuleEntry(moduleDir, manifest)),
      typesDir: join(
        moduleDir,
        manifest.paths?.types ?? DEFAULT_MODULE_PATHS.types,
      ),
      routesRoot: join(moduleDir, routesBase),
      workflowsRoot: join(moduleDir, workflowsBase),
      aliases: { module: `@${moduleId}`, workflows: "@workflows" },
    },
    logger,
  );
}
