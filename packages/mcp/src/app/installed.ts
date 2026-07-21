import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { appDir } from "../env";

interface LockRecord {
  artifactId?: string;
  kind?: string;
  mode?: string;
  verification?: string;
  version?: string;
}

interface InstallerLock {
  installations?: Record<string, LockRecord>;
}

/** List module installations from the transactional installer lockfile. */
export function listInstalled(): Array<Record<string, unknown>> {
  const path = join(appDir(), "damat.lock.json");
  if (!existsSync(path)) return [];
  let lock: InstallerLock;
  try {
    lock = JSON.parse(readFileSync(path, "utf-8"));
  } catch (error) {
    throw new Error(`Invalid damat.lock.json: ${String(error)}`);
  }
  if (!lock.installations || typeof lock.installations !== "object") {
    throw new Error("Invalid damat.lock.json: installations must be an object");
  }
  return Object.entries(lock.installations)
    .filter(([, record]) => record?.kind === "module")
    .map(([id, record]) => ({
      id,
      artifactId: record.artifactId,
      version: record.version,
      mode: record.mode,
      verification: record.verification,
    }))
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
}
