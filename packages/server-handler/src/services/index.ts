import type { AppConfig } from "@damatjs/utils-config";
import type { ServiceInstances } from "./types";
import { initLogger, getLogger } from "./logger";
import { initDatabase, closeDatabase } from "./database";
import { initRedisService, closeRedis } from "./redis";

export async function initializeServices(config: AppConfig): Promise<ServiceInstances> {
  const logger = initLogger(config.projectConfig.loggerConfig);

  const instances: ServiceInstances = {
    logger,
    shutdownHandlers: [],
  };

  if (config.projectConfig.databaseUrl) {
    instances.pool = await initDatabase(config.projectConfig.databaseUrl, logger);
    instances.shutdownHandlers.push({
      name: "database",
      handler: async () => {
        await closeDatabase();
        logger.info("Database connection closed");
      },
    });
  }

  const redisConfig = config.services?.redis;
  if (redisConfig?.enabled !== false && process.env.REDIS_URL) {
    await initRedisService({ enabled: true, url: redisConfig?.url }, logger);

    instances.shutdownHandlers.push({
      name: "redis",
      handler: async () => {
        await closeRedis();
        logger.info("Redis connection closed");
      },
    });
  }

  instances.shutdownHandlers.push({
    name: "logger",
    handler: async () => {
      const log = getLogger();
      log.info("Shutting down logger");
      if ("close" in log && typeof log.close === "function") {
        log.close();
      }
    },
  });

  if (process.env.REDIS_URL) {
    const { getRedis } = await import("@damatjs/utils");
    instances.healthChecks = {
      redis: async () => {
        const start = Date.now();
        await getRedis().ping();
        return { status: "healthy", latency: Date.now() - start };
      },
    };
  }

  return instances;
}

export type { ServiceInstances } from "./types";
export { initLogger, getLogger } from "./logger";
export { initDatabase, closeDatabase } from "./database";
export { initRedisService, closeRedis } from "./redis";
