import type { CommandContext } from "@damatjs/cli";
import type { DamatManifest, InstallerPlan } from "@damatjs/installer";

export function reportKitPlan(
  ctx: CommandContext,
  plan: InstallerPlan,
  provider?: DamatManifest,
): void {
  ctx.logger.info(`${plan.action} ${plan.kind} "${plan.installationId}"`, {
    mode: plan.mode,
    ...(plan.packageBackend && { packageBackend: plan.packageBackend }),
    operations: plan.operations.length,
  });
  plan.warnings.forEach((warning) => ctx.logger.warn(warning));
  const instructions =
    plan.action === "remove"
      ? provider?.install?.instructions?.remove
      : provider?.install?.instructions?.add;
  instructions?.forEach((instruction) => ctx.logger.info(instruction));
}
