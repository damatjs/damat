import { randomUUID } from "node:crypto";
import { readInstallerLock, writeInstallerLock } from "../lockfile";
import { analyzeOwnership } from "../plan";
import type { InstallerPlan } from "../types/plan";
import type { InstallerRuntime } from "../types/runtime";
import { applyFileOperation, applyPackageOperation } from "./apply";
import { captureInverse, createJournal, rollbackJournal } from "./journal";
import { recordFromPlan } from "./record";

export interface ExecutionResult {
  status: "applied" | "dry-run";
  completed: number;
  nodeModules: "unchanged" | "best-effort";
}

export async function executePlan(
  plan: InstallerPlan,
  runtime: InstallerRuntime,
): Promise<ExecutionResult> {
  if (runtime.dryRun)
    return { status: "dry-run", completed: 0, nodeModules: "unchanged" };
  const lock = readInstallerLock(plan.projectDir);
  const conflicts = analyzeOwnership(plan, lock).conflicts;
  if (conflicts.length)
    throw new Error(
      `installation conflicts: ${conflicts.map(({ code }) => code).join(", ")}`,
    );
  const id = randomUUID();
  const journal = createJournal(plan.projectDir, id);
  let completed = 0;
  let packageChanged = false;
  try {
    for (const operation of plan.operations) {
      if (operation.type === "write-file" || operation.type === "remove-file") {
        journal.append(captureInverse(plan.projectDir, operation.target));
        applyFileOperation(plan.projectDir, operation);
      } else if (
        operation.type === "add-package" ||
        operation.type === "remove-package"
      ) {
        await applyPackageOperation(
          plan.projectDir,
          operation,
          runtime,
          journal,
        );
        packageChanged = true;
      }
      completed += 1;
      runtime.afterOperation?.(completed);
    }
    journal.append(captureInverse(plan.projectDir, "damat.lock.json"));
    if (plan.action === "remove")
      delete lock.installations[plan.installationId];
    else lock.installations[plan.installationId] = recordFromPlan(plan);
    writeInstallerLock(plan.projectDir, lock);
    journal.complete();
    return {
      status: "applied",
      completed,
      nodeModules: packageChanged ? "best-effort" : "unchanged",
    };
  } catch (error) {
    rollbackJournal(plan.projectDir, id);
    throw error;
  }
}
