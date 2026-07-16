import { reportError, type Command } from "@damatjs/cli";
import { createRemovePlan, readInstallerLock } from "@damatjs/installer";
import { executeKitPlan, installOptions } from "../shared";

export const kitRemoveCommand: Command = {
  name: "remove",
  description: "Remove installer-owned kit files and report remaining usage",
  usage: "damat kit remove <name> [--yes] [--dry-run]",
  options: installOptions,
  handler: async (ctx) => {
    const name = ctx.args[0];
    if (!name) return { exitCode: 1 };
    try {
      const plan = createRemovePlan({
        projectDir: ctx.cwd,
        installationId: name,
        lock: readInstallerLock(ctx.cwd),
        confirmModified: Boolean(ctx.options.yes),
      });
      await executeKitPlan(ctx, plan);
      return { exitCode: 0 };
    } catch (error) {
      reportError(ctx.logger, error, { prefix: "Failed to remove kit" });
      return { exitCode: 1 };
    }
  },
};
