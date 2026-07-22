import type { AppConfig } from "../config";
import type { ServiceInitializationOptions, ServiceInstances } from "./types";
import { initLogger, closeLogger } from "./logger";
import { initializeDatabase } from "./initialize/database";
import { initializeRedis } from "./initialize/redis";
import { initializeEventBroadcast } from "./initialize/events";
import { initializeModules } from "./initialize/modules";
import { initializeAuth } from "./initialize/auth";
import { initializeProviders } from "./initialize/providers";
import { initializeDurability } from "./initialize/durability";
import { initializePipelineDefinitions } from "./initialize/pipelines";
import { resolveRuntime, startWorkers, type ResolvedRuntime } from "../runtime";
import { runServiceShutdownHandlers } from "./shutdown";

export async function initializeServices(
  config: AppConfig,
  cwd: string = process.cwd(),
  runtime: ResolvedRuntime = resolveRuntime(config, {}),
  options: ServiceInitializationOptions = {},
): Promise<ServiceInstances> {
  const logger = initLogger(config.projectConfig.loggerConfig);
  const instances: ServiceInstances = {
    healthChecks: {},
    shutdownHandlers: [],
  };
  try {
    await initializeDatabase(config, instances, logger);
    await initializeRedis(config, instances, logger);
    await initializeModules(config, instances, cwd);
    await options.beforeDurability?.({ config, instances, logger });
    await initializeProviders(config, instances, logger);
    await initializeAuth(config, instances, logger);
    await initializeEventBroadcast(config, instances, logger);
    const coordinator = await initializeDurability(config, instances);
    if (coordinator) instances.durabilityCoordinator = coordinator;
    await initializePipelineDefinitions(config, instances);
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
  } catch (error) {
    await runServiceShutdownHandlers(instances.shutdownHandlers, logger);
    closeLogger();
    throw error;
  }
}

export type { ServiceInitializationOptions, ServiceInstances } from "./types";
export { runServiceShutdownHandlers } from "./shutdown";
export * from "./logger";
export * from "./database";
export * from "./redis";
export * from "./moduleService";
export * from "./moduleProviders";
export * from "./providers";
export type {
  ProviderBinding,
  ProviderBindings,
  ProviderRegistry,
} from "@damatjs/provider";
