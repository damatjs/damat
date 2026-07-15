import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { hashFile } from "../integrity";
import type { BackupManifest } from "./manifest";
import { backupPath } from "./path";

export interface RestoreResult {
  restored: string[];
}

export function restoreBackup(projectDir: string, id: string): RestoreResult {
  const root = backupPath(projectDir, id);
  const manifest = JSON.parse(
    readFileSync(join(root, "manifest.json"), "utf8"),
  ) as BackupManifest;
  for (const file of manifest.files) {
    const source = join(root, file.storedAs);
    if (hashFile(source) !== file.checksum)
      throw new Error(`backup integrity mismatch: ${file.path}`);
    const target = join(projectDir, file.path);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  return { restored: manifest.files.map(({ path }) => path) };
}
