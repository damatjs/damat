import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { WorkspacePackage } from "../publish/types";

interface LockedWorkspace {
  name?: string;
  version?: string;
}

interface BunLock {
  workspaces?: Record<string, LockedWorkspace>;
}

export function verifyWorkspaceLock(
  root: string,
  packages: WorkspacePackage[],
): void {
  const lock = Bun.JSONC.parse(
    readFileSync(join(root, "bun.lock"), "utf8"),
  ) as BunLock;
  const workspaces = lock.workspaces ?? {};
  const byName = new Map(
    Object.entries(workspaces).map(([path, entry]) => [
      entry.name,
      { path, entry },
    ]),
  );

  for (const pkg of packages) {
    const locked = byName.get(pkg.name);
    if (!locked)
      throw new Error(`bun.lock has no workspace entry for ${pkg.name}`);
    if (locked.entry.version !== pkg.version)
      throw new Error(
        `bun.lock records ${pkg.name}@${locked.entry.version ?? "<missing>"}; package.json is ${pkg.version}. Run bun install and commit bun.lock.`,
      );
    const expectedPath = relative(root, pkg.dir);
    if (locked.path !== expectedPath)
      throw new Error(
        `bun.lock maps ${pkg.name} to ${locked.path}; expected ${expectedPath}`,
      );
  }
}
