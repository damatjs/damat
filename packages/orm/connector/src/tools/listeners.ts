import type { Pool } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";

export function setupPoolListeners(pool: Pool, logger: ILogger): void {
  pool.on("error", (err) => {
    logger.error("PostgreSQL pool error", { error: err.message });
  });

  pool.on("connect", () => {
    logger.debug("New client connected to pool");
  });

  pool.on("remove", () => {
    logger.debug("Client removed from pool");
  });
}
