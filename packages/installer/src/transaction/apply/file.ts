import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { hashFile } from "../../integrity";
import type { InstallerOperation } from "../../types/plan";

export function applyFileOperation(
  projectDir: string,
  operation: InstallerOperation,
): void {
  if (operation.type === "write-file") {
    if (hashFile(operation.source) !== operation.checksum)
      throw new Error(`source checksum changed: ${operation.source}`);
    const target = join(projectDir, operation.target);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(operation.source, target);
  } else if (operation.type === "remove-file")
    rmSync(join(projectDir, operation.target), { force: true });
}
