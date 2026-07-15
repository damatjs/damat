import { join } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import type { ModuleManifest } from "@damatjs/module";
import type { ModuleSource } from "@damatjs/framework";
import type { ResolvedModuleSource } from "../helpers";
import {
  deregisterModuleFromConfig,
  registerModuleInConfig,
  syncEnvVars,
} from "../helpers";

export function refreshUpdateConfig(
  ctx: CommandContext,
  configPath: string,
  moduleId: string,
  modulesDir: string,
  resolved: ResolvedModuleSource,
  manifest: ModuleManifest,
): void {
  const origin: ModuleSource = {
    ...resolved.origin,
    installedAt: new Date().toISOString(),
  };
  deregisterModuleFromConfig(configPath, moduleId);
  const target = `./${join(modulesDir, moduleId)}`;
  if (registerModuleInConfig(configPath, moduleId, target, origin))
    ctx.logger.success(`Refreshed "${moduleId}" provenance in damat.config.ts`);
  else
    ctx.logger.warn(
      `Could not update damat.config.ts automatically — re-add:\n  "${moduleId}": { resolve: "${target}", id: "${moduleId}" },`,
    );
  const env = syncEnvVars(ctx.cwd, manifest);
  if (env.addedToExample.length)
    ctx.logger.info(`Added to .env.example: ${env.addedToExample.join(", ")}`);
  if (env.missingInEnv.length)
    ctx.logger.warn(
      `Set these in your .env before starting: ${env.missingInEnv.join(", ")}`,
    );
}
