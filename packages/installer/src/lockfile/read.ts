import { existsSync, readFileSync } from "node:fs";
import { parseInstallerLock } from "../schema";
import type { InstallerLock } from "../types/lockfile";
import { installerLockPath } from "./path";

export function readInstallerLock(projectDir: string): InstallerLock {
  const path = installerLockPath(projectDir);
  if (!existsSync(path)) return { schemaVersion: 1, installations: {} };
  try {
    return parseInstallerLock(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid damat.lock.json: ${message}`);
  }
}
