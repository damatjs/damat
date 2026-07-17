import type { AppConfig } from "../config";
import type { ServiceInstances } from "./types";
import { initLogger, closeLogger } from "./logger";
import { initializeDatabase } from "./initialize/database";
import { initializeRedis } from "./initialize/redis";
import { initializeEventBroadcast } from "./initialize/events";
import { initializeModules } from "./initialize/modules";
import { initializeAuth } from "./initialize/auth";
import { initializeDurability } from "./initialize/durability";
import { resolveRuntime, startWorkers, type ResolvedRuntime } from "../runtime";

export async function initializeServices(
  config: AppConfig,
  cwd: string = process.cwd(),
  runtime: ResolvedRuntime = resolveRuntime(config, {}),
): Promise<ServiceInstances> {
  const logger = initLogger(config.projectConfig.loggerConfig);
  const instances: ServiceInstances = {
    healthChecks: {},
    shutdownHandlers: [],
  };
  await initializeDatabase(config, instances, logger);
  await initializeRedis(config, instances, logger);
  await initializeModules(config, instances, cwd);
  await initializeAuth(config, instances, logger);
  await initializeEventBroadcast(config, instances, logger);
  await initializeDurability(config);
  startWorkers(config, instances, logger, runtime);
  instances.shutdownHandlers.push({
    name: "logger",
    phase: "logger",
    handler: async () => {
      logger.info("Shutting down logger");
      closeLogger();
    },
  });
  return instances;
}

export type { ServiceInstances } from "./types";
export * from "./logger";
export * from "./database";
export * from "./redis";
export * from "./moduleService";
export * from "./moduleProviders";
