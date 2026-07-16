import { join } from "node:path";
import { runCodegen } from "@damatjs/module-generator";
import { asToolingLogger } from "../../toolingLogger";
import { augmentWithLinks } from "./augmentWithLinks";
import { codegenPaths } from "./modulePaths";
import type {
  ModuleCodegenOutcome,
  RunModuleCodegenArgs,
} from "./runModuleTypes";
export type { ModuleCodegenOutcome } from "./runModuleTypes";
import { codegenEligibility } from "./eligibility";
import { reportGeneration } from "./reportGeneration";

/**
 * App-mode codegen for ONE module: generate its row types + zod + registry,
 * weave in cross-module link fields, and scaffold the CRUD slice. The actual
 * generation is the shared `@damatjs/module-generator` core; resolution
 * (paths, links) lives here.
 *
 * Throws only if generation itself fails; eligibility (link / missing models)
 * is reported via the returned outcome so the caller can decide severity.
 */
export async function runModuleCodegen({
  modules,
  moduleName,
  moduleConfig,
  cwd,
  flat,
  logger,
  strict,
}: RunModuleCodegenArgs): Promise<ModuleCodegenOutcome> {
  const eligibility = codegenEligibility(
    moduleName,
    moduleConfig,
    strict,
    logger,
  );
  if (eligibility) return eligibility;

  // Default groups routes under the module (src/api/routes/<module>/<table>);
  // `--flat` dumps just the models (src/api/routes/<table>).
  const apiRoutesBase = join(cwd, "src", "api", "routes");
  const routesRoot = flat ? apiRoutesBase : join(apiRoutesBase, moduleName);

  logger.info(
    `Generating codegen for module '${moduleName}' (routes: ${flat ? "flat" : "module"})...`,
  );
  const paths = codegenPaths(moduleConfig, cwd, moduleName);
  const result = await runCodegen(
    {
      moduleResolver: paths.models,
      moduleId: moduleName,
      serviceDir: paths.serviceDir,
      typesDir: paths.typesDir,
      routesRoot,
      workflowsRoot: join(cwd, "src", "workflows", moduleName),
      // Portable aliases: `@<module>/*` for the parts under src/modules/<module>
      // (types, service), `@workflows/*` for the relocated workflow tree. The
      // app tsconfig defines both (per-module `@<module>` added on install).
      aliases: { module: `@${moduleName}`, workflows: "@workflows" },
      ...(paths.moduleTypeImport && {
        moduleTypeImport: paths.moduleTypeImport,
      }),
      augmentFilesMap: (filesMap) =>
        augmentWithLinks({ modules, moduleName, logger }, filesMap),
    },
    asToolingLogger(logger),
  );

  reportGeneration(logger, result);
  return "generated";
}
