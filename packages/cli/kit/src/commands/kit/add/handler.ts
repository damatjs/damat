import { reportError, type Command } from "@damatjs/cli";
import { buildKitInstallPlan, executeKitPlan, reportKitPlan } from "../shared";

export const handleKitAdd: Command["handler"] = async (ctx) => {
  const source = ctx.args[0];
  if (!source) {
    ctx.logger.error("Usage: damat kit add <source>");
    return { exitCode: 1 };
  }
  try {
    const resolved = await buildKitInstallPlan(ctx, source);
    try {
      if (ctx.options["dry-run"])
        reportKitPlan(ctx, resolved.plan, resolved.provider);
      else await executeKitPlan(ctx, resolved.plan, resolved.provider);
    } finally {
      resolved.artifact.cleanup();
    }
    return { exitCode: 0 };
  } catch (error) {
    reportError(ctx.logger, error, { prefix: "Failed to add kit" });
    return { exitCode: 1 };
  }
};
