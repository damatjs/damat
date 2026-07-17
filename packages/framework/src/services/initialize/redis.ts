import type { ILogger } from "@damatjs/logger";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";
import { connectRedis, disconnectRedis, getRedis, initRedis } from "../redis";

export async function initializeRedis(
  config: AppConfig,
  instances: ServiceInstances,
  logger: ILogger,
): Promise<void> {
  if (!config.projectConfig.redisUrl) {
    instances.healthChecks!.redis = async () => ({
      status: "not configured",
      data: {},
    });
    return;
  }
  await initRedis({
    url: config.services?.redis?.url ?? config.projectConfig.redisUrl,
    logger,
  });
  await connectRedis();
  instances.healthChecks!.redis = async () => {
    const start = Date.now();
    try {
      await getRedis().ping();
      return { status: "healthy", latency: Date.now() - start };
    } catch (data) {
      return { status: "unhealthy", latency: Date.now() - start, data };
    }
  };
  instances.shutdownHandlers.push({
    name: "redis",
    phase: "redis",
    handler: async () => {
      await disconnectRedis();
      logger.info("Redis connection closed");
    },
  });
}
