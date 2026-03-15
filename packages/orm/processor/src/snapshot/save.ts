import fs from "node:fs";

import type { ModuleSnapshot } from "../types/snapshot";
import { getSnapshotPath } from "./path";

/**
 * Persist a snapshot to disk, stamping a fresh `updatedAt`.
 * Creates the migrations directory if it does not exist.
 *
 * @param migrationsDir  Absolute path to the module's migrations directory
 * @param snapshot       The snapshot to persist (without `updatedAt` — stamped here)
 */
export function saveSnapshot(
  migrationsDir: string,
  snapshot: Omit<ModuleSnapshot, "updatedAt">,
): void {
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const full: ModuleSnapshot = {
    ...snapshot,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    getSnapshotPath(migrationsDir),
    JSON.stringify(full, null, 2),
  );
}
