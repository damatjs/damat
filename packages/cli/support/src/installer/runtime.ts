import type { CommandContext } from "@damatjs/cli";
import type { AcquisitionPorts, InstallerRuntime } from "@damatjs/installer";
import { runInstallerCommand } from "./runner";
import { createRegistryResolver } from "./registry";

export function createInstallerPorts(_ctx: CommandContext): AcquisitionPorts {
  return {
    run: runInstallerCommand,
    resolveRegistry: createRegistryResolver(_ctx.cwd),
    fetch: async (url) => {
      const response = await fetch(url);
      return {
        ok: response.ok,
        status: response.status,
        arrayBuffer: () => response.arrayBuffer(),
        json: () => response.json(),
      };
    },
  };
}

export function createInstallerRuntime(ctx: CommandContext): InstallerRuntime {
  const manager = ctx.options["package-manager"];
  const packageManager =
    manager === "bun" ||
    manager === "npm" ||
    manager === "pnpm" ||
    manager === "yarn"
      ? manager
      : undefined;
  return {
    run: runInstallerCommand,
    logger: {
      info: (message) => ctx.logger.info(message),
      warn: (message) => ctx.logger.warn(message),
      error: (message) => ctx.logger.error(message),
    },
    dryRun: Boolean(ctx.options["dry-run"]),
    allowScripts: Boolean(ctx.options["allow-scripts"]),
    ...(packageManager && { packageManager }),
  };
}
