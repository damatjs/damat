import type { InstallerLock } from "../types/lockfile";
import type { InstallerPlan } from "../types/plan";
import { fileIssue, type OwnershipIssue } from "./collisions";

export interface OwnershipReport {
  conflicts: OwnershipIssue[];
  warnings: OwnershipIssue[];
  packageOwners: Record<string, number>;
}

export function analyzeOwnership(
  plan: InstallerPlan,
  lock: InstallerLock,
): OwnershipReport {
  const conflicts: OwnershipIssue[] = [];
  const warnings: OwnershipIssue[] = [];
  const targets = new Set<string>();
  for (const operation of plan.operations) {
    if (operation.type !== "write-file") continue;
    if (targets.has(operation.target))
      conflicts.push({ code: "duplicate-target", target: operation.target });
    targets.add(operation.target);
    const issue = fileIssue(
      plan.projectDir,
      plan.installationId,
      operation,
      lock,
    );
    if (issue?.code === "missing-owned") warnings.push(issue);
    else if (issue) conflicts.push(issue);
  }
  const packageOwners: Record<string, number> = {};
  for (const record of Object.values(lock.installations)) {
    for (const item of record.packages)
      packageOwners[item.name] = (packageOwners[item.name] ?? 0) + 1;
  }
  return { conflicts, warnings, packageOwners };
}
