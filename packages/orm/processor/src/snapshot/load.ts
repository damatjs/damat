import fs from "node:fs";

import type { ModuleSnapshot } from "../types/snapshot";
import { EMPTY_SNAPSHOT } from "../types/snapshot";
import { getSnapshotPath } from "./path";


/**
 * Load the persisted snapshot for a module.
 *
 * Always returns a valid `ModuleSnapshot` — never throws, never returns
 * undefined. Falls back to the empty baseline when the file is missing or
 * cannot be parsed.
 *
 * @param migrationsDir  Absolute path to the module's migrations directory
 */
export function snapshotExist(migrationsDir: string): boolean {
  const filePath = getSnapshotPath(migrationsDir);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  return true;
}


/**
 * Load the persisted snapshot for a module.
 *
 * Always returns a valid `ModuleSnapshot` — never throws, never returns
 * undefined. Falls back to the empty baseline when the file is missing or
 * cannot be parsed.
 *
 * @param migrationsDir  Absolute path to the module's migrations directory
 */
export function loadSnapshot(migrationsDir: string): ModuleSnapshot {
  const filePath = getSnapshotPath(migrationsDir);

  if (!fs.existsSync(filePath)) {
    return { ...EMPTY_SNAPSHOT, updatedAt: new Date().toISOString() };
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ModuleSnapshot>;

    return {
      namespaces: parsed.namespaces ?? EMPTY_SNAPSHOT.namespaces,
      name: parsed.name ?? EMPTY_SNAPSHOT.name,
      tables: parsed.tables ?? EMPTY_SNAPSHOT.tables,
      nativeEnums: parsed.nativeEnums ?? EMPTY_SNAPSHOT.nativeEnums,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return { ...EMPTY_SNAPSHOT, updatedAt: new Date().toISOString() };
  }
}
