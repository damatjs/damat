import { existsSync } from "node:fs";
import { join } from "node:path";
import { createBackup } from "../backup";
import { hashFile } from "../integrity";
import type { InstallerLock } from "../types/lockfile";
import type { InstallerPlan } from "../types/plan";
import { scanUsage } from "../usage";

export interface RemoveInput {
  projectDir: string;
  installationId: string;
  lock: InstallerLock;
  confirmModified?: boolean;
}

export function createRemovePlan(input: RemoveInput): InstallerPlan {
  const record = input.lock.installations[input.installationId];
  if (!record)
    throw new Error(`installation not found: ${input.installationId}`);
  const existing = record.files.filter(({ path }) =>
    existsSync(join(input.projectDir, path)),
  );
  const modified = existing
    .filter(
      ({ path, checksum }) =>
        hashFile(join(input.projectDir, path)) !== checksum,
    )
    .map(({ path }) => path);
  if (modified.length && !input.confirmModified)
    throw new Error("modified owned files require confirmation before removal");
  const backup = modified.length
    ? createBackup(input.projectDir, record, modified)
    : undefined;
  const usage = scanUsage(
    input.projectDir,
    record.usageHints,
    record.files.map(({ path }) => path),
  );
  const owners = new Map<string, number>();
  Object.values(input.lock.installations).forEach((item) =>
    item.packages.forEach(({ name }) =>
      owners.set(name, (owners.get(name) ?? 0) + 1),
    ),
  );
  const packages = record.packages.filter(({ name }) => owners.get(name) === 1);
  return {
    schemaVersion: 1,
    action: "remove",
    projectDir: input.projectDir,
    installationId: input.installationId,
    kind: record.kind,
    ...(record.version && { version: record.version }),
    mode: record.mode,
    ...(record.packageBackend && { packageBackend: record.packageBackend }),
    provenance: record.provenance,
    artifactIntegrity: record.artifactIntegrity,
    recipeIntegrity: record.recipeIntegrity,
    verification: record.verification,
    usageHints: record.usageHints,
    operations: [
      ...existing.map(({ path, checksum }) => ({
        type: "remove-file" as const,
        target: path,
        installedChecksum: checksum,
      })),
      ...packages.map(({ name, reference }) => ({
        type: "remove-package" as const,
        name,
        reference,
      })),
    ],
    warnings: [
      usage.warning,
      ...usage.matches.map(
        (match) =>
          `${match.path}:${match.line}:${match.column} uses ${match.token}`,
      ),
    ],
    ...(backup && { backupId: backup.id }),
  };
}
