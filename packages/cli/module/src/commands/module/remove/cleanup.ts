import { join, relative } from "node:path";
import { generateBarrels } from "@damatjs/codegen";
import type { CommandContext } from "@damatjs/cli";
import type { ModuleManifest } from "@damatjs/module";
import { asToolingLogger } from "../../../toolingLogger";
import {
  deregisterModuleFromConfig,
  removeModuleEnvVars,
  removeModuleTsconfigPaths,
} from "../helpers";

export function cleanRegistration(
  ctx: CommandContext,
  configPath: string,
  moduleId: string,
): void {
  if (deregisterModuleFromConfig(configPath, moduleId))
    ctx.logger.success(`Deregistered "${moduleId}" from damat.config.ts`);
  else
    ctx.logger.warn(
      `Could not update damat.config.ts automatically — delete the "${moduleId}" entry from its modules block`,
    );
}

export function cleanTsconfig(ctx: CommandContext, moduleId: string): void {
  const result = removeModuleTsconfigPaths(ctx.cwd, moduleId);
  if (result === "updated")
    ctx.logger.success(`Removed "@${moduleId}/*" alias from tsconfig.json`);
  else if (result === "skipped")
    ctx.logger.warn(
      `Could not update tsconfig.json automatically — remove "@${moduleId}/*" from compilerOptions.paths`,
    );
}

export function cleanEnvironment(
  ctx: CommandContext,
  manifest: ModuleManifest,
): void {
  const removed = removeModuleEnvVars(ctx.cwd, manifest.name);
  if (removed.length === 0) return;
  ctx.logger.info(`Removed from .env.example: ${removed.join(", ")}`);
  ctx.logger.warn(
    `Values in .env were left untouched — remove ${removed.join(", ")} yourself if nothing else uses them`,
  );
}

export function refreshWorkflows(
  ctx: CommandContext,
  removed: string[],
  target: string,
): void {
  if (removed.includes(target))
    generateBarrels(
      join(ctx.cwd, "src", "workflows"),
      asToolingLogger(ctx.logger),
    );
  for (const path of removed)
    ctx.logger.success(`Removed ${relative(ctx.cwd, path)}`);
}
