import type { CommandContext } from "@damatjs/cli";
import { executePlan, type DamatManifest, type InstallerPlan } from "@damatjs/installer";
import { createInstallerRuntime } from "@damatjs/cli-support";
import { reportModulePlan } from "./report";

export interface ExecuteDependencies {
  execute: typeof executePlan;
  runtime: typeof createInstallerRuntime;
}

const dependencies: ExecuteDependencies = {
  execute: executePlan,
  runtime: createInstallerRuntime,
};

export async function executeModulePlan(
  ctx: CommandContext,
  plan: InstallerPlan,
  provider?: DamatManifest,
  deps: ExecuteDependencies = dependencies,
): Promise<void> {
  reportModulePlan(ctx, plan, provider);
  await deps.execute(plan, deps.runtime(ctx));
}
