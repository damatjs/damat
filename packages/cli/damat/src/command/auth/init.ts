import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import type { Command } from "@damatjs/cli";
import { registerModuleInConfig } from "../module/helpers";
import {
  modelsTemplate,
  serviceTemplate,
  indexTemplate,
  manifestTemplate,
  readmeTemplate,
} from "./scaffold/templates";

/** Providers that persist locally and therefore need a storage module. */
const STORAGE_PROVIDERS = new Set(["better-auth"]);
/** Hosted providers that need no local tables. */
const HOSTED_PROVIDERS = new Set(["clerk", "auth0"]);

export const authInitCommand: Command = {
  name: "init",
  description: "Scaffold the storage module an auth provider needs (Better Auth); no-op for hosted providers",
  usage: "damat auth init <provider> [--dir <path>] [--force]",
  examples: [
    "damat auth init better-auth      # scaffold src/modules/auth (owned by you)",
    "damat auth init clerk            # hosted — prints that no tables are needed",
  ],
  options: [
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Modules directory (default: src/modules)",
      default: "src/modules",
    },
    {
      name: "force",
      alias: "f",
      type: "boolean",
      description: "Overwrite an existing auth storage module",
      default: false,
    },
  ],
  handler: async (ctx) => {
    const provider = ctx.args[0];
    if (!provider) {
      ctx.logger.error("Usage: damat auth init <provider>   (better-auth | clerk | auth0)");
      return { exitCode: 1 };
    }

    if (HOSTED_PROVIDERS.has(provider)) {
      ctx.logger.info(
        `"${provider}" is a hosted provider — it needs no local tables, so there is nothing to scaffold.\n` +
          `Install the adapter and set services.auth.provider in damat.config.ts:\n` +
          `  bun add @damatjs/auth-${provider} @damatjs/auth` +
          (provider === "clerk" ? " @clerk/backend" : " jose"),
      );
      return { exitCode: 0 };
    }

    if (!STORAGE_PROVIDERS.has(provider)) {
      ctx.logger.error(
        `Unknown provider "${provider}" — expected better-auth, clerk, or auth0`,
      );
      return { exitCode: 1 };
    }

    // Better Auth: scaffold the storage module.
    const modulesDir = ctx.options.dir as string;
    const targetDir = join(ctx.cwd, modulesDir, "auth");
    if (existsSync(targetDir) && !ctx.options.force) {
      ctx.logger.error(
        `${modulesDir}/auth already exists — use --force to overwrite`,
      );
      return { exitCode: 1 };
    }

    const files: Record<string, string> = {
      "models/index.ts": modelsTemplate(),
      "service.ts": serviceTemplate(),
      "index.ts": indexTemplate(),
      "module.json": manifestTemplate(),
      "README.md": readmeTemplate(),
    };
    mkdirSync(join(targetDir, "migrations"), { recursive: true });
    for (const [rel, content] of Object.entries(files)) {
      const full = join(targetDir, rel);
      mkdirSync(join(full, ".."), { recursive: true });
      writeFileSync(full, content);
    }
    ctx.logger.success(`Scaffolded the Better Auth storage module at ${modulesDir}/auth`);

    // Register it in damat.config.ts like any module.
    const configPath = join(ctx.cwd, "damat.config.ts");
    const relativeTarget = `./${join(modulesDir, "auth")}`;
    if (registerModuleInConfig(configPath, "auth", relativeTarget)) {
      ctx.logger.success('Registered "auth" in damat.config.ts');
    } else {
      ctx.logger.warn(
        `Could not update damat.config.ts automatically — add to your modules block:\n` +
          `  auth: { resolve: "${relativeTarget}", id: "auth" },`,
      );
    }

    ctx.logger.info(
      [
        "Next steps:",
        "  1. bun add @damatjs/auth-better-auth @damatjs/auth better-auth",
        "  2. bun damat-orm migrate:create auth_init   # diff the models -> a migration",
        "  3. bun damat-orm migrate:up                 # create the tables",
        "  4. add services.auth to damat.config.ts:",
        '       services: { auth: { provider: "better-auth", options: { secret: process.env.BETTER_AUTH_SECRET } } }',
        "  You own src/modules/auth — adjust the models to match your Better Auth version.",
      ].join("\n"),
    );
    return { exitCode: 0 };
  },
};
