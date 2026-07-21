import { existsSync } from "node:fs";
import { join } from "node:path";
import { hashFile } from "../integrity";
import type { InstallerLock } from "../types/lockfile";
import type { InstallerOperation } from "../types/plan";

export interface OwnershipIssue {
  code:
    | "duplicate-target"
    | "unowned-target"
    | "owned-by-other"
    | "modified-owned"
    | "missing-owned";
  target: string;
  owner?: string;
}

export function fileIssue(
  projectDir: string,
  installationId: string,
  operation: Extract<InstallerOperation, { type: "write-file" }>,
  lock: InstallerLock,
): OwnershipIssue | undefined {
  const owner = Object.entries(lock.installations).find(([, record]) =>
    record.files.some((file) => file.path === operation.target),
  );
  const path = join(projectDir, operation.target);
  if (!owner)
    return existsSync(path) && !operation.adopt
      ? { code: "unowned-target", target: operation.target }
      : undefined;
  if (owner[0] !== installationId)
    return {
      code: "owned-by-other",
      target: operation.target,
      owner: owner[0],
    };
  const installed = owner[1].files.find(
    (file) => file.path === operation.target,
  )!;
  if (!existsSync(path))
    return { code: "missing-owned", target: operation.target, owner: owner[0] };
  if (hashFile(path) !== installed.checksum && !operation.adopt)
    return {
      code: "modified-owned",
      target: operation.target,
      owner: owner[0],
    };
  return undefined;
}
