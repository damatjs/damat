import { reportError, type Command } from "@damatjs/cli";
import {
  buildModuleInstallPlan, executeModulePlan, reportModulePlan,
} from "../shared";

export interface AddDependencies {
  build: typeof buildModuleInstallPlan;
  execute: typeof executeModulePlan;
  report: typeof reportModulePlan;
}

const dependencies: AddDependencies = {
  build: buildModuleInstallPlan,
  execute: executeModulePlan,
  report: reportModulePlan,
};

export function createModuleAddHandler(
  deps: AddDependencies = dependencies,
): Command["handler"] {
  return async (ctx) => {
    const source = ctx.args[0];
    if (!source) {
      ctx.logger.error("Usage: damat module add <source>");
      return { exitCode: 1 };
    }
    try {
      const resolved = await deps.build(ctx, source);
      try {
        if (ctx.options["dry-run"])
          deps.report(ctx, resolved.plan, resolved.provider);
        else await deps.execute(ctx, resolved.plan, resolved.provider);
      } finally {
        resolved.artifact.cleanup();
      }
      return { exitCode: 0 };
    } catch (error) {
      reportError(ctx.logger, error, { prefix: "Failed to add module" });
      return { exitCode: 1 };
    }
  };
}

export const handleModuleAdd = createModuleAddHandler();
