import { join } from "node:path";
import { runCodegen, type RunModuleCodegenResult } from "@damatjs/codegen";
import type { ILogger } from "@damatjs/logger";
import { readModuleManifest } from "../manifest/read";
import { DEFAULT_MODULE_PATHS } from "../manifest/types";
import { locateModuleDir } from "../runtime/locate";

export type ModuleCodegenResult = RunModuleCodegenResult;

/**
 * Generate a standalone module package's types + zod + registry + CRUD scaffold.
 *
 * This is a thin manifest resolver: it reads `module.json` to find the module's
 * paths, then hands **resolved inputs** to the shared, agnostic
 * `@damatjs/codegen` core. Both trees are **flat by table** here
 * (`api/routes/<resource>` and `workflows/<resource>`) — a module is a
 * single-purpose blade and owns no module-id namespace. `damat module add` adds
 * the `<moduleId>/` segment when it relocates these into a host app
 * (`src/api/routes/<id>/<resource>`, `src/workflows/<id>/<resource>`). Generated
 * files reach types/service via `@<module>/*` and reach workflows through the
 * bare `@workflows` barrel root, so the imports resolve unchanged before and
 * after install. The module has no cross-module links, so no link augmentation
 * is applied.
 */
export async function generateModuleTypes(
  packageDir: string,
  logger: ILogger,
): Promise<ModuleCodegenResult> {
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);
  const moduleId = manifest.name;
  const workflowsBase =
    manifest.paths?.workflows ?? DEFAULT_MODULE_PATHS.workflows;

  return runCodegen(
    {
      moduleResolver: moduleDir,
      moduleId,
      serviceDir: moduleDir,
      typesDir: join(
        moduleDir,
        manifest.paths?.types ?? DEFAULT_MODULE_PATHS.types,
      ),
      routesRoot: join(moduleDir, "api", "routes"),
      workflowsRoot: join(moduleDir, workflowsBase),
      aliases: { module: `@${moduleId}`, workflows: "@workflows" },
    },
    logger,
  );
}
