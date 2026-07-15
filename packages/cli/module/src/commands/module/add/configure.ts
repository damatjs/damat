import { join } from "node:path";
import type { CommandContext } from "@damatjs/cli";
import type { ModuleSource } from "@damatjs/framework";
import {
  ensureLinksInConfig,
  registerModuleInConfig,
  registerModuleTsconfigPaths,
  syncEnvVars,
} from "../helpers";
import type { AddState } from "./types";

export function configureInstalledModule(
  ctx: CommandContext,
  state: AddState,
  hasLinks: boolean,
) {
  const { moduleId, relativeTarget, resolved, manifest } = state;
  const configPath = join(ctx.cwd, "damat.config.ts");
  const origin: ModuleSource = {
    ...resolved.origin,
    installedAt: new Date().toISOString(),
  };
  if (registerModuleInConfig(configPath, moduleId, relativeTarget, origin)) {
    ctx.logger.success(`Registered "${moduleId}" in damat.config.ts`);
  } else {
    ctx.logger.warn(
      `Could not update damat.config.ts automatically — add this to your modules block:\n  "${moduleId}": { resolve: "${relativeTarget}", id: "${moduleId}" },`,
    );
  }
  if (hasLinks) {
    if (ensureLinksInConfig(configPath))
      ctx.logger.success('Ensured links: "./src/links" in damat.config.ts');
    else
      ctx.logger.warn(
        'Add `links: "./src/links"` to your damat.config.ts (could not edit it automatically)',
      );
  }
  const tsResult = registerModuleTsconfigPaths(ctx.cwd, moduleId);
  if (tsResult === "updated")
    ctx.logger.success("Added portable aliases to tsconfig.json");
  else if (tsResult === "skipped")
    ctx.logger.warn(
      `Could not update tsconfig.json automatically — add to compilerOptions.paths:\n  "@${moduleId}/*": ["./src/modules/${moduleId}/*"]\n  "@workflows": ["./src/workflows"]        (app-level; add once)\n  "@workflows/*": ["./src/workflows/*"]    (app-level; add once)`,
    );
  const env = syncEnvVars(ctx.cwd, manifest);
  if (env.addedToExample.length)
    ctx.logger.info(`Added to .env.example: ${env.addedToExample.join(", ")}`);
  if (env.missingInEnv.length)
    ctx.logger.warn(
      `Set these in your .env before starting: ${env.missingInEnv.join(", ")}`,
    );
}
