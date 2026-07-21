import { reportError, type Command } from "@damatjs/cli";
import { buildKitInstallPlan, installOptions, reportKitPlan } from "../shared";

export const kitPlanCommand: Command = {
  name: "plan",
  description: "Preview a kit installation without mutation",
  usage: "damat kit plan <source> [options]",
  options: installOptions,
  handler: async (ctx) => {
    const source = ctx.args[0];
    if (!source) return { exitCode: 1 };
    try {
      const resolved = await buildKitInstallPlan(ctx, source);
      try {
        reportKitPlan(ctx, resolved.plan, resolved.provider);
      } finally {
        resolved.artifact.cleanup();
      }
      return { exitCode: 0 };
    } catch (error) {
      reportError(ctx.logger, error, { prefix: "Failed to plan kit" });
      return { exitCode: 1 };
    }
  },
};
