import { existsSync } from "node:fs";
import { join } from "node:path";
import { createBackup } from "../backup";
import { hashFile } from "../integrity";
import type { InstallerLock } from "../types/lockfile";
import type { InstallMode, InstallRecipe } from "../types/recipe";
import type { ResolvedArtifact } from "../origin";
import { createInstallPlan } from "./create";

export interface UpdateInput {
  projectDir: string;
  artifact: ResolvedArtifact;
  recipe: InstallRecipe;
  lock: InstallerLock;
  mode?: InstallMode;
  confirmModified?: boolean;
}

export async function createUpdatePlan(input: UpdateInput) {
  const current = input.lock.installations[input.recipe.id];
  if (!current) throw new Error(`installation not found: ${input.recipe.id}`);
  const plan = createInstallPlan(input);
  plan.action = "update";
  const desired = new Set(
    plan.operations
      .filter((item) => item.type === "write-file")
      .map((item) => item.target),
  );
  const existing = current.files.filter(({ path }) =>
    existsSync(join(input.projectDir, path)),
  );
  const modified = existing
    .filter(
      ({ path, checksum }) =>
        hashFile(join(input.projectDir, path)) !== checksum,
    )
    .map(({ path }) => path);
  if (modified.length && !input.confirmModified)
    throw new Error("modified owned files require confirmation before update");
  const backup = modified.length
    ? createBackup(input.projectDir, current, modified)
    : undefined;
  plan.operations = [
    ...plan.operations.map((operation) =>
      operation.type === "write-file" && modified.includes(operation.target)
        ? { ...operation, adopt: true }
        : operation,
    ),
    ...existing
      .filter(({ path }) => !desired.has(path))
      .map(({ path, checksum }) => ({
        type: "remove-file" as const,
        target: path,
        installedChecksum: checksum,
      })),
  ];
  if (backup) plan.backupId = backup.id;
  return plan;
}
