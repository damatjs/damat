import type { CommandContext } from "@damatjs/cli";
import { executePlan, type DamatManifest, type InstallerPlan } from "@damatjs/installer";
import { createInstallerRuntime } from "@damatjs/cli-support";
import { reportKitPlan } from "./report";

export async function executeKitPlan(
  ctx: CommandContext,
  plan: InstallerPlan,
  provider?: DamatManifest,
): Promise<void> {
  reportKitPlan(ctx, plan, provider);
  await executePlan(plan, createInstallerRuntime(ctx));
}
