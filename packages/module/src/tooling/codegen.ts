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
 * `@damatjs/codegen` core. Output is flat inside the package
 * (`api/routes/<resource>`, `workflows/<resource>`) — the module is its own
 * namespace and has no cross-module links, so no link augmentation is applied.
 */
export async function generateModuleTypes(
  packageDir: string,
  logger: ILogger,
): Promise<ModuleCodegenResult> {
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);

  return runCodegen(
    {
      moduleResolver: moduleDir,
      moduleId: manifest.name,
      serviceDir: moduleDir,
      typesDir: join(
        moduleDir,
        manifest.paths?.types ?? DEFAULT_MODULE_PATHS.types,
      ),
      routesRoot: join(moduleDir, "api", "routes"),
      workflowsRoot: join(
        moduleDir,
        manifest.paths?.workflows ?? DEFAULT_MODULE_PATHS.workflows,
      ),
    },
    logger,
  );
}
