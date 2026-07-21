import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AcquiredArtifact } from "./types";

export function acquireLocal(path: string): AcquiredArtifact {
  const absolute = resolve(path);
  if (!existsSync(absolute))
    throw new Error(`local artifact not found: ${absolute}`);
  return {
    request: { type: "local", path },
    rootDir: absolute,
    metadata: { sourcePath: absolute },
    cleanup() {},
  };
}
