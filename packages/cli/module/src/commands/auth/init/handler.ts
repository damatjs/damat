import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "@damatjs/cli";
import { registerModuleInConfig } from "../../module/helpers";
import { AUTH_NEXT_STEPS, hostedProviderMessage } from "./messages";
import { writeStorageModule } from "./writeStorageModule";

const STORAGE_PROVIDERS = new Set(["better-auth"]);
const HOSTED_PROVIDERS = new Set(["clerk", "auth0"]);

export const handleAuthInit: Command["handler"] = async (ctx) => {
  const provider = ctx.args[0];
  if (!provider) {
    ctx.logger.error(
      "Usage: damat auth init <provider>   (better-auth | clerk | auth0)",
    );
    return { exitCode: 1 };
  }
  if (HOSTED_PROVIDERS.has(provider)) {
    ctx.logger.info(hostedProviderMessage(provider));
    return { exitCode: 0 };
  }
  if (!STORAGE_PROVIDERS.has(provider)) {
    ctx.logger.error(
      `Unknown provider "${provider}" — expected better-auth, clerk, or auth0`,
    );
    return { exitCode: 1 };
  }
  const modulesDir = ctx.options.dir as string;
  const targetDir = join(ctx.cwd, modulesDir, "auth");
  if (existsSync(targetDir) && !ctx.options.force) {
    ctx.logger.error(
      `${modulesDir}/auth already exists — use --force to overwrite`,
    );
    return { exitCode: 1 };
  }
  writeStorageModule(targetDir);
  ctx.logger.success(
    `Scaffolded the Better Auth storage module at ${modulesDir}/auth`,
  );
  const configPath = join(ctx.cwd, "damat.config.ts");
  const relativeTarget = `./${join(modulesDir, "auth")}`;
  if (registerModuleInConfig(configPath, "auth", relativeTarget)) {
    ctx.logger.success('Registered "auth" in damat.config.ts');
  } else {
    ctx.logger.warn(
      `Could not update damat.config.ts automatically — add to your modules block:\n  auth: { resolve: "${relativeTarget}", id: "auth" },`,
    );
  }
  ctx.logger.info(AUTH_NEXT_STEPS);
  return { exitCode: 0 };
};
