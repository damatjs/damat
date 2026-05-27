
import type { ServiceInstances } from "./types";
import { initLogger, closeLogger } from "./logger";
import { initDatabase, closeDatabase } from "./database";
import { initRedis, disconnectRedis, getRedis } from "./redis";
import { AppConfig } from '../config';

export async function initializeServices(config: AppConfig): Promise<ServiceInstances> {
  const logger = initLogger(config.projectConfig.loggerConfig);

  const instances: ServiceInstances = {
    shutdownHandlers: [],
  };

  if (config.projectConfig.databaseUrl) {

    await initDatabase(
      config.services?.database ?? {
        connectionString: config.projectConfig.databaseUrl
      },
      logger
    );


    instances.shutdownHandlers.push({
      name: "database",
      handler: async () => {
        await closeDatabase();
        logger.info("Database connection closed");
      },
    });
  }

  const redisConfig = config.services?.redis;
  if (redisConfig && config.projectConfig.redisUrl) {
    await initRedis({ url: redisConfig?.url }, logger);

    instances.shutdownHandlers.push({
      name: "redis",
      handler: async () => {
        await disconnectRedis();
        logger.info("Redis connection closed");
      },
    });
  }

  instances.shutdownHandlers.push({
    name: "logger",
    handler: async () => {
      logger.info("Shutting down logger");
      closeLogger();
    },
  });

  if (process.env.REDIS_URL) {
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
export * from "./logger";
export * from "./database";
export * from "./redis";
