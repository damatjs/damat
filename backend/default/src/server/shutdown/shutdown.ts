/**
 * Perform graceful shutdown
 */

import { disconnectRedis } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { closeConnection } from '@damatjs/utils';

export async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    await Promise.all([closeConnection(), disconnectRedis()]);
    logger.info("Cleanup complete, exiting");
    process.exit(0);
  } catch (err) {
    logger.error(
      "Error during shutdown",
      err instanceof Error ? err : undefined,
    );
    process.exit(1);
  }
}
