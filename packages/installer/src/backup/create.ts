import { randomUUID } from "node:crypto";
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { hashFile } from "../integrity";
import type { InstallationRecord } from "../types/lockfile";
import type { BackupManifest } from "./manifest";
import { backupPath } from "./path";

export function createBackup(
  projectDir: string,
  installation: InstallationRecord,
  paths: string[],
): BackupManifest {
  const id = `${Date.now()}-${randomUUID()}`;
  const root = backupPath(projectDir, id);
  const files = [...paths].sort().map((path) => {
    const storedAs = join("files", path).split("\\").join("/");
    const source = join(projectDir, path);
    const target = join(root, storedAs);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    return { path, checksum: hashFile(source), storedAs };
  });
  const manifest = {
    id,
    createdAt: new Date().toISOString(),
    artifactId: installation.artifactId,
    provenance: installation.provenance,
    files,
  };
  mkdirSync(root, { recursive: true });
  writeFileSync(
    join(root, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  return manifest;
}
