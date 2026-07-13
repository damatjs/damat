import { existsSync, unlinkSync } from "node:fs";
import type { ILogger } from "@damatjs/logger";

/**
 * Best-effort removal of a generated temp entry file. A leftover file is
 * cosmetic, so failures never abort the command — they surface at debug level.
 */
export function cleanupTempFile(path: string, logger: ILogger): void {
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch (err) {
    logger.debug(
      `Failed to clean up ${path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
