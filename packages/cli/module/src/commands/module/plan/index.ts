import type { Command } from "@damatjs/cli";
import {
  buildModuleInstallPlan,
  moduleInstallOptions,
  reportModuleError,
  reportModulePlan,
} from "../shared";

export interface ModulePlanDependencies {
  build: typeof buildModuleInstallPlan;
  report: typeof reportModulePlan;
}

const dependencies: ModulePlanDependencies = {
  build: buildModuleInstallPlan,
  report: reportModulePlan,
};

export function createModulePlanHandler(
  deps: ModulePlanDependencies = dependencies,
): Command["handler"] {
  return async (ctx) => {
    const source = ctx.args[0];
    if (!source) return { exitCode: 1 };
    try {
      const resolved = await deps.build(ctx, source);
      try {
        deps.report(ctx, resolved.plan, resolved.provider);
      } finally {
        resolved.artifact.cleanup();
      }
      return { exitCode: 0 };
    } catch (error) {
      reportModuleError(ctx, error, "Failed to plan module");
      return { exitCode: 1 };
    }
  };
}

export const modulePlanCommand: Command = {
  name: "plan",
  description: "Preview a module installation without mutation",
  usage: "damat module plan <source> [options]",
  options: moduleInstallOptions,
  handler: createModulePlanHandler(),
};
