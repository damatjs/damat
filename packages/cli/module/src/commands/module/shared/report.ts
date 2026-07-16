import type { CommandContext } from "@damatjs/cli";
import type { DamatManifest, InstallerPlan } from "@damatjs/installer";
import { moduleInstructions } from "../profile";

export function reportModulePlan(
  ctx: CommandContext,
  plan: InstallerPlan,
  provider?: DamatManifest,
): void {
  ctx.logger.info(`${plan.action} module "${plan.installationId}"`, {
    mode: plan.mode,
    ...(plan.packageBackend && { packageBackend: plan.packageBackend }),
    operations: plan.operations.length,
  });
  plan.warnings.forEach((warning) => ctx.logger.warn(warning));
  const defaults = moduleInstructions(plan.installationId);
  const instructions = plan.action === "remove"
    ? provider?.install?.instructions?.remove ?? defaults.remove
    : provider?.install?.instructions?.add ?? defaults.add;
  instructions.forEach((instruction) => ctx.logger.info(instruction));
}
