import { join, relative } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import { generateBarrels } from "@damatjs/codegen";
import { asToolingLogger } from "../../../toolingLogger";
import type { ModuleManifest } from "@damatjs/module";
import type { ResolvedModuleSource } from "../helpers";
import { installModulePackages, installModuleSplit } from "../helpers";
import { refreshUpdateConfig } from "./configure";

export function applyModuleUpdate(
  ctx: CommandContext,
  moduleId: string,
  modulesDir: string,
  configPath: string,
  resolved: ResolvedModuleSource,
  sourceDir: string,
  manifest: ModuleManifest,
  packages: Record<string, string>,
): boolean {
  const installed = installModuleSplit(sourceDir, {
    cwd: ctx.cwd,
    moduleId,
    modulesDir,
    packageDir: resolved.dir,
    force: true,
  });
  ctx.logger.success(
    `Updated module at ${relative(ctx.cwd, installed.moduleHome)}`,
  );
  if (installed.workflowsTarget)
    generateBarrels(
      join(ctx.cwd, "src", "workflows"),
      asToolingLogger(ctx.logger),
    );
  refreshUpdateConfig(
    ctx,
    configPath,
    moduleId,
    modulesDir,
    resolved,
    manifest,
  );
  if (Object.keys(packages).length) {
    ctx.logger.info(`Installing packages: ${Object.keys(packages).join(", ")}`);
    const result = installModulePackages(ctx.cwd, packages, {
      allowScripts: Boolean(ctx.options["allow-scripts"]),
    });
    if (!result.ok) {
      ctx.logger.error(`bun add failed:\n${result.output}`);
      return false;
    }
    ctx.logger.success("Packages installed");
  }
  ctx.logger.info(
    [
      "Next steps:",
      "  1. bun damat-orm migrate:up    # apply any new migrations",
      "  2. restart the dev server",
    ].join("\n"),
  );
  return true;
}
