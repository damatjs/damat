import type { Command } from "@damatjs/cli";
import { authInitCommand } from "./init";

/**
 * The `auth` command group. Damat integrates the famous auth providers (Better
 * Auth / Clerk / Auth0) via `@damatjs/auth-*` adapters wired through
 * `services.auth` in damat.config.ts. This group scaffolds the one piece that
 * lives in your codebase: the storage tables a persisting provider (Better
 * Auth) needs, as a module you own.
 */
export const authCommand: Command = {
  name: "auth",
  description: "Set up authentication providers (Better Auth / Clerk / Auth0)",
  subcommands: [authInitCommand],
  handler: async (ctx) => {
    ctx.logger.info(
      [
        "Authentication is provider-based and opt-in — wire it in damat.config.ts:",
        '  services: { auth: { provider: "better-auth" | "clerk" | "auth0", options: { … } } }',
        "",
        "Commands:",
        "  damat auth init <provider>   Scaffold the storage module a provider needs",
        "                               (Better Auth); hosted providers need none.",
        "",
        "Install the adapter + its SDK, then set services.auth:",
        "  Better Auth : bun add @damatjs/auth-better-auth @damatjs/auth better-auth",
        "  Clerk       : bun add @damatjs/auth-clerk @damatjs/auth @clerk/backend",
        "  Auth0       : bun add @damatjs/auth-auth0 @damatjs/auth jose",
      ].join("\n"),
    );
    return { exitCode: 0 };
  },
};

export { authInitCommand };
