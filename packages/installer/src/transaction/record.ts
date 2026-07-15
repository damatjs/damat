import type { InstallationRecord } from "../types/lockfile";
import type { InstallerPlan } from "../types/plan";

export function recordFromPlan(plan: InstallerPlan): InstallationRecord {
  return {
    artifactId: plan.installationId,
    kind: plan.kind,
    ...(plan.version && { version: plan.version }),
    mode: plan.mode,
    provenance: plan.provenance,
    artifactIntegrity: plan.artifactIntegrity,
    recipeIntegrity: plan.recipeIntegrity,
    verification: plan.verification,
    installedAt: new Date().toISOString(),
    files: plan.operations
      .filter((item) => item.type === "write-file")
      .map((item) => ({ path: item.target, checksum: item.checksum })),
    packages: plan.operations
      .filter((item) => item.type === "add-package")
      .map((item) => ({ name: item.name, reference: item.reference })),
    usageHints: plan.usageHints,
  };
}
