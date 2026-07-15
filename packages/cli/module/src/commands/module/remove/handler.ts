import { join } from "node:path";
import {
  reportError,
  type CommandContext,
  type CommandResult,
} from "@damatjs/cli";
import {
  moduleIdError,
  moduleLayoutPaths,
  modulesDirError,
  readModuleConfigEntry,
  removeModuleSplit,
} from "../helpers";
import {
  cleanEnvironment,
  cleanRegistration,
  cleanTsconfig,
  refreshWorkflows,
} from "./cleanup";
import { findDependents, readInstalledManifest } from "./manifest";
import { existingTargets, removalPlan } from "./plan";

export async function handleModuleRemove(
  ctx: CommandContext,
): Promise<CommandResult> {
  const moduleId = ctx.args[0];
  if (!moduleId) return fail(ctx, "Usage: damat module remove <id>");
  const modulesDir = ctx.options.dir as string;
  const guardError = moduleIdError(moduleId) ?? modulesDirError(modulesDir);
  if (guardError) return fail(ctx, guardError);
  try {
    const configPath = join(ctx.cwd, "damat.config.ts");
    const entry = readModuleConfigEntry(configPath, moduleId);
    const layout = moduleLayoutPaths(ctx.cwd, moduleId, modulesDir);
    const targets = existingTargets(layout);
    if (targets.length === 0 && !entry)
      return fail(
        ctx,
        `Module "${moduleId}" is not installed (nothing to remove)`,
      );
    const dependents = findDependents(ctx.cwd, modulesDir, moduleId);
    if (dependents.length && !ctx.options.force)
      return fail(
        ctx,
        `Refusing to remove "${moduleId}" — these installed modules depend on it:\n  ${dependents.join("\n  ")}\nRemove them first, or re-run with --force.`,
      );
    if (dependents.length)
      ctx.logger.warn(
        `Removing "${moduleId}" although ${dependents.join(", ")} depend(s) on it (--force)`,
      );
    const manifest = readInstalledManifest(layout.moduleHome);
    const plan = removalPlan(
      ctx.cwd,
      moduleId,
      targets,
      entry,
      Boolean(ctx.options["clean-env"]),
      manifest,
    );
    if (ctx.options["dry-run"]) {
      ctx.logger.info(
        [
          `Dry run — removing "${moduleId}" would:`,
          ...plan.map((item) => `  - ${item}`),
        ].join("\n"),
      );
      return { exitCode: 0 };
    }
    const result = removeModuleSplit(ctx.cwd, moduleId, modulesDir);
    refreshWorkflows(ctx, result.removed, layout.workflowsTarget);
    if (result.linksRegenerated)
      ctx.logger.info("Regenerated src/links/index.ts aggregator");
    if (entry) cleanRegistration(ctx, configPath, moduleId);
    cleanTsconfig(ctx, moduleId);
    if (ctx.options["clean-env"] && manifest) cleanEnvironment(ctx, manifest);
    ctx.logger.info(
      [
        "Next steps:",
        "  1. Review your database — the module's tables/migrations were NOT rolled back",
        "  2. bun remove <pkg>            # if packages were installed only for this module",
        "  3. restart the dev server",
      ].join("\n"),
    );
    return { exitCode: 0 };
  } catch (error) {
    reportError(ctx.logger, error, { prefix: "Failed to remove module" });
    return { exitCode: 1 };
  }
}

function fail(ctx: CommandContext, message: string): CommandResult {
  ctx.logger.error(message);
  return { exitCode: 1 };
}
