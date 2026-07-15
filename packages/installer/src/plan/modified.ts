import type { OwnershipReport } from "./ownership";

export function hasModifiedOwnedFiles(report: OwnershipReport): boolean {
  return report.conflicts.some(({ code }) => code === "modified-owned");
}
