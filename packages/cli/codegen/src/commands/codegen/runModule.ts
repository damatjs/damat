import { join } from "node:path";
import type { CliLogger } from "@damatjs/cli";
import { runCodegen } from "@damatjs/codegen";
import { asToolingLogger } from "../../toolingLogger";
import { augmentWithLinks } from "./augmentWithLinks";
import { ModuleContainer, ModuleEntry, typesPath } from "./constant";
import { codegenEligibility } from "./eligibility";
import { reportGeneration } from "./reportGeneration";

/**
 * Result of attempting codegen for a single module:
 * - `generated` — types/zod/registry/scaffold were produced.
 * - `skipped`   — link module, or (non-strict) a module with no models dir.
 * - `error`     — strict run hit a missing models dir (caller should fail).
 */
export type ModuleCodegenOutcome = "generated" | "skipped" | "error";

export interface RunModuleCodegenArgs {
  /** Every module in the config, so link fields can be woven in. */
  modules: ModuleContainer;
  /** The module to generate for. */
  moduleName: string;
  moduleConfig: ModuleEntry;
  /** App root (where `src/api` and `src/workflows` live). */
  cwd: string;
  /** `--flat`: dump routes at src/api/routes/<table> instead of per-module. */
  flat: boolean;
  logger: CliLogger;
  /**
   * When the module was named explicitly (`damat codegen <module>`), a missing
   * models directory is a hard error. In a whole-app run it's a soft skip so
   * one stray entry can't abort generation for the rest.
   */
  strict: boolean;
}

/**
 * App-mode codegen for ONE module: generate its row types + zod + registry,
 * weave in cross-module link fields, and scaffold the CRUD slice. The actual
 * generation is the shared, agnostic `@damatjs/codegen` core; resolution
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
  const typesDir = typesPath(moduleConfig.resolve);
  const result = await runCodegen(
    {
      moduleResolver: moduleConfig.resolve,
      moduleId: moduleName,
      serviceDir: moduleConfig.resolve,
      typesDir,
      routesRoot,
      workflowsRoot: join(cwd, "src", "workflows", moduleName),
      // Portable aliases: `@<module>/*` for the parts under src/modules/<module>
      // (types, service), `@workflows/*` for the relocated workflow tree. The
      // app tsconfig defines both (per-module `@<module>` added on install).
      aliases: { module: `@${moduleName}`, workflows: "@workflows" },
      augmentFilesMap: (filesMap) =>
        augmentWithLinks({ modules, moduleName, logger }, filesMap),
    },
    asToolingLogger(logger),
  );

  reportGeneration(logger, result);
  return "generated";
}
