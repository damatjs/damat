import type { Pool } from "@damatjs/deps/pg";
import type { LoggerInterface } from "../types";

export function setupPoolListeners(pool: Pool, logger: LoggerInterface): void {
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
