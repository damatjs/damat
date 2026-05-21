import type { Pool } from "@damatjs/orm-type";
import type { Logger } from "@damatjs/logger";

export function setupPoolListeners(pool: Pool, logger: Logger): void {
  pool.on("error", (err) => {
    logger.error("PostgreSQL pool error", { error: err.message });
  });

  pool.on("connect", () => {
    logger.debug("New client connected to pool");
  });

  pool.on("acquire", () => {
    logger.debug("Client acquired from pool");
  });

  pool.on("release", () => {
    logger.debug("Client released back to pool");
  });

  pool.on("remove", () => {
    logger.debug("Client removed from pool");
  });
}
