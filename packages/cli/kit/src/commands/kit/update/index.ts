import { reportError, type Command } from "@damatjs/cli";
import { readInstallerLock } from "@damatjs/installer";
import { buildKitInstallPlan, executeKitPlan, installOptions } from "../shared";

export const kitUpdateCommand: Command = {
  name: "update",
  description: "Update a kit from its recorded origin",
  usage: "damat kit update <name> [options]",
  options: installOptions,
  handler: async (ctx) => {
    const name = ctx.args[0];
    const record = name ? readInstallerLock(ctx.cwd).installations[name] : undefined;
    if (!record || record.kind !== "kit") {
      ctx.logger.error(`kit installation not found: ${name ?? ""}`);
      return { exitCode: 1 };
    }
    try {
      const resolved = await buildKitInstallPlan(ctx, record.provenance.request, "update");
      try {
        await executeKitPlan(ctx, resolved.plan, resolved.provider);
      } finally {
        resolved.artifact.cleanup();
      }
      return { exitCode: 0 };
    } catch (error) {
      reportError(ctx.logger, error, { prefix: "Failed to update kit" });
      return { exitCode: 1 };
    }
  },
};
