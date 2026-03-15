import path from "node:path";

export const SNAPSHOT_FILENAME = ".snapshot.json";

/**
 * Resolve the absolute path to the snapshot file for a migrations directory.
 */
export function getSnapshotPath(migrationsDir: string): string {
  return path.join(migrationsDir, SNAPSHOT_FILENAME);
}
