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
 * `@damatjs/codegen` core. Routes are flat by table (`api/routes/<resource>`);
 * workflows are nested under the module id (`workflows/<module>/<resource>`) so
 * the emitted `@workflows/<module>/<resource>/…` alias is identical here and
 * after the module is installed into a host backend. Generated files import via
 * the portable `@<module>/*` and `@workflows/*` aliases. The module is its own
 * namespace and has no cross-module links, so no link augmentation is applied.
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
      // Nest workflows by module id so `@workflows/<module>/<table>/…` resolves
      // the same standalone and after install (where app workflows live at
      // `src/workflows/<module>/<table>`).
      workflowsRoot: join(moduleDir, workflowsBase, moduleId),
      aliases: { module: `@${moduleId}`, workflows: "@workflows" },
    },
    logger,
  );
}
