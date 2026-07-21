import { existsSync, unlinkSync } from "node:fs";
import type { CliLogger } from "@damatjs/cli";

export function cleanupTempFile(path: string, logger: CliLogger): void {
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.debug(`Failed to clean up ${path}: ${message}`);
  }
}
