import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import type { PlannedFile } from "../plan";
import type { CopyResult } from "./types";

export function copyPlanned(
  kitDir: string,
  projectRoot: string,
  files: PlannedFile[],
  force: boolean,
): CopyResult {
  const result: CopyResult = { written: [], skipped: [] };
  const root = resolve(projectRoot);
  for (const file of files) {
    const target = resolve(root, file.target);
    if (target !== root && !target.startsWith(root + sep)) {
      throw new Error(`Refusing to write outside the project root: ${file.target}`);
    }
    if (existsSync(target) && !force) {
      result.skipped.push(file);
      continue;
    }
    mkdirSync(join(target, ".."), { recursive: true });
    cpSync(join(kitDir, file.source), target);
    result.written.push(file);
  }
  return result;
}
