
import type { ServiceInstances } from "./types";
import { initLogger, closeLogger } from "./logger";
import { initDatabase, closeDatabase, getConnectionManager } from "./database";
import { AppConfig } from '../config';
import { disconnectRedis, getRedis, initRedis } from './redis';

export async function initializeServices(config: AppConfig): Promise<ServiceInstances> {
  const logger = initLogger(config.projectConfig.loggerConfig);

  const instances: ServiceInstances = {
    healthChecks: {
      database: async () => {
        return {
          status: "Ideal",
          data: {}
        }
      },
      redis: async () => {
        return {
          status: "Ideal",
          data: {}
        }
      },
    },
    shutdownHandlers: [],
  };
  if (config.projectConfig.databaseUrl) {
    await initDatabase(
      config.services?.database ?? {
        connectionString: config.projectConfig.databaseUrl
      },
      logger,
      config.projectConfig.nodeEnv ?? "development"
    );

    instances.healthChecks!.database = async () => {
      {
        const start = Date.now();
        try {
          const data = await getConnectionManager()?.healthCheck();
          return { status: "healthy", latency: Date.now() - start, data };
        } catch (e) {
          return { status: "unhealthy", latency: Date.now() - start, data: e };
        }
      }
    };

    instances.shutdownHandlers.push({
      name: "database",
      handler: async () => {
        await closeDatabase();
        logger.info("Database connection closed");
      },
    });
  } else {
    instances.healthChecks!.database = async () => {
      {
        return { status: "not configured", data: {} }
      }
    };
  }

  const redisConfig = config.services?.redis;
  if (config.projectConfig.redisUrl) {
    const url = redisConfig?.url ?? config.projectConfig.redisUrl;
    await initRedis({ url }, logger);

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

  if (config.projectConfig.redisUrl) {
    instances.healthChecks!.redis = async () => {
      {
        const start = Date.now();
        try {
          await getRedis().ping();
          return { status: "healthy", latency: Date.now() - start };
        } catch (e) {
          return { status: "unhealthy", latency: Date.now() - start, data: e };
        }
      }
    };
  } else {
    instances.healthChecks!.redis = async () => {
      {
        return { status: "not configured", data: {} }
      }
    };
  }

  return instances;
}

export type { ServiceInstances } from "./types";
export * from "./logger";
export * from "./database";
export * from "./redis";
