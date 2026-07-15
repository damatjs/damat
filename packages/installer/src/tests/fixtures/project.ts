import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashFile } from "../../integrity";
import type { InstallationRecord, InstallerLock } from "../../types/lockfile";

export function tempProject(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "installer-project-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(join(root, path, ".."), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  return root;
}

export function record(project: string, files: string[]): InstallationRecord {
  const request = { type: "local" as const, path: "." };
  return {
    artifactId: "blade",
    kind: "module",
    mode: "source",
    provenance: {
      request,
      immutableIdentity: "local:x",
      resolvedAt: "now",
      metadata: {},
    },
    artifactIntegrity: "artifact",
    recipeIntegrity: "recipe",
    verification: "verified",
    installedAt: "now",
    files: files.map((path) => ({
      path,
      checksum: hashFile(join(project, path)),
    })),
    packages: [],
    usageHints: [{ token: "useBlade", targets: ["src/**/*.ts"] }],
  };
}

export function lock(installation: InstallationRecord): InstallerLock {
  return { schemaVersion: 1, installations: { blade: installation } };
}
