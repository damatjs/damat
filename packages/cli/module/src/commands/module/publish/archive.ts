import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export interface Archive {
  bytes: Uint8Array;
  cleanup: () => void;
}

export function createPublishArchive(
  cwd: string,
  name: string,
  version: string,
): Archive {
  const tempDir = mkdtempSync(join(tmpdir(), "damat-publish-"));
  const path = join(tempDir, `${name}-${version}.tgz`);
  const included = ["src", "module.json", "package.json"].filter((entry) =>
    existsSync(join(cwd, entry)),
  );
  const result = spawnSync("tar", ["-czf", path, "-C", cwd, ...included], {
    encoding: "buffer",
  });
  if (result.status !== 0) {
    bestEffortRemove(tempDir);
    throw new Error(
      `Failed to create tarball: ${result.stderr?.toString() ?? ""}`,
    );
  }
  return {
    bytes: readFileSync(path),
    cleanup: () => bestEffortRemove(tempDir),
  };
}

function bestEffortRemove(path: string): void {
  try {
    rmSync(path, { recursive: true, force: true });
  } catch {
    /* best-effort cleanup */
  }
}
