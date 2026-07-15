import { randomUUID } from "node:crypto";
import { renameSync, rmSync, writeFileSync } from "node:fs";
import { parseInstallerLock } from "../schema";
import type { InstallerLock } from "../types/lockfile";
import { installerLockPath } from "./path";

export interface LockfileWriteIo {
  rename?(from: string, to: string): void;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)]),
  );
}

export function writeInstallerLock(
  projectDir: string,
  input: InstallerLock,
  io: LockfileWriteIo = {},
): void {
  const lock = parseInstallerLock(input);
  const path = installerLockPath(projectDir);
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(canonical(lock), null, 2)}\n`, {
      flag: "wx",
    });
    (io.rename ?? renameSync)(temporary, path);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
}
