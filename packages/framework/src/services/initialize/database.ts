import type { ILogger } from "@damatjs/logger";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";
import { closeDatabase, getConnectionManager, initDatabase } from "../database";

export async function initializeDatabase(
  config: AppConfig,
  instances: ServiceInstances,
  logger: ILogger,
): Promise<void> {
  if (!config.projectConfig.databaseUrl) {
    instances.healthChecks!.database = async () => ({
      status: "not configured",
      data: {},
    });
    return;
  }
  await initDatabase(
    config.services?.database ?? {
      connectionString: config.projectConfig.databaseUrl,
    },
    logger,
    config.projectConfig.nodeEnv ?? "development",
  );
  instances.healthChecks!.database = async () => {
    const start = Date.now();
    try {
      const data = await getConnectionManager()?.healthCheck();
      return { status: "healthy", latency: Date.now() - start, data };
    } catch (data) {
      return { status: "unhealthy", latency: Date.now() - start, data };
    }
  };
  instances.shutdownHandlers.push({
    name: "database",
    phase: "postgres",
    handler: async () => {
      await closeDatabase();
      logger.info("Database connection closed");
    },
  });
}
