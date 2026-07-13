import type { ServiceInstances } from "./types";
import { initLogger, closeLogger } from "./logger";
import { initDatabase, closeDatabase, getConnectionManager } from "./database";
import { AppConfig } from "../config";
import { disconnectRedis, getRedis, initRedis, connectRedis } from "./redis";
import { connectEventBroadcast, disconnectEventBroadcast } from "@damatjs/events";
import { JobWorker } from "@damatjs/jobs";
import { initAuth } from "./auth";
import { initModules, getAllModules, getModule } from "./moduleService";
import { resolveLinkModuleEntries, setLinkModuleResolver } from "@damatjs/link";

export async function initializeServices(
  config: AppConfig,
  cwd: string = process.cwd(),
): Promise<ServiceInstances> {
  const logger = initLogger(config.projectConfig.loggerConfig);

  // `database` and `redis` are always assigned below (either the live probe or
  // a "not configured" stub), so the map starts empty rather than carrying
  // placeholder closures that would only ever be overwritten.
  const instances: ServiceInstances = {
    healthChecks: {},
    shutdownHandlers: [],
  };
  if (config.projectConfig.databaseUrl) {
    await initDatabase(
      config.services?.database ?? {
        connectionString: config.projectConfig.databaseUrl,
      },
      logger,
      config.projectConfig.nodeEnv ?? "development",
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
        return { status: "not configured", data: {} };
      }
    };
  }

  const redisConfig = config.services?.redis;
  if (config.projectConfig.redisUrl) {
    const url = redisConfig?.url ?? config.projectConfig.redisUrl;
    await initRedis({
      url,
      logger,
    });

    await connectRedis();

    instances.shutdownHandlers.push({
      name: "redis",
      handler: async () => {
        await disconnectRedis();
        logger.info("Redis connection closed");
      },
    });
  }

  // Cross-process event broadcasting (opt-in; local events need no config).
  if (config.services?.events?.broadcast) {
    if (config.projectConfig.redisUrl) {
      const channel = config.services.events.channel;
      await connectEventBroadcast(channel ? { channel } : {});
      instances.shutdownHandlers.push({
        name: "event-broadcast",
        handler: async () => {
          await disconnectEventBroadcast();
          logger.info("Event broadcast disconnected");
        },
      });
    } else {
      logger.warn(
        "services.events.broadcast is set but projectConfig.redisUrl is not — events stay in-process",
      );
    }
  }

  // Modules plus any cross-module link directories (registered as `link`
  // module(s)) are initialised together, so `getModule("link")` resolves the
  // link service alongside the rest.
  const moduleConfigs = [
    ...Object.values(config.modules ?? {}),
    ...resolveLinkModuleEntries(config.links, cwd).map((entry) => ({
      id: entry.id,
      resolve: entry.resolve,
    })),
  ];
  if (moduleConfigs.length) {
    await initModules(moduleConfigs, cwd);
    instances.modules = getAllModules();
  }

  // Let the link service hydrate linked rows by calling other modules'
  // services. No-op when no link module is registered.
  setLinkModuleResolver((id: string) => getModule(id));

  // Auth provider (opt-in). Built after the database so a persisting provider
  // (Better Auth) can receive the app's pool. Nothing is imported when
  // `services.auth` is unset.
  const auth = await initAuth(config, logger);
  if (auth) {
    instances.auth = auth;
    if (auth.shutdown) {
      instances.shutdownHandlers.push({
        name: "auth",
        handler: async () => {
          await auth.shutdown!();
          logger.info("Auth provider shut down");
        },
      });
    }
  }

  // The job worker starts AFTER module init so every module's defineJob()
  // has registered before the first dequeue.
  const jobsConfig = config.services?.jobs;
  if (jobsConfig?.worker) {
    if (config.projectConfig.redisUrl) {
      const worker = new JobWorker({
        ...(jobsConfig.queueName !== undefined ? { queueName: jobsConfig.queueName } : {}),
        ...(jobsConfig.concurrency !== undefined ? { concurrency: jobsConfig.concurrency } : {}),
        ...(jobsConfig.pollIntervalMs !== undefined
          ? { pollIntervalMs: jobsConfig.pollIntervalMs }
          : {}),
      });
      worker.start();
      instances.shutdownHandlers.push({
        name: "job-worker",
        handler: async () => {
          await worker.stop();
        },
      });
    } else {
      logger.warn(
        "services.jobs.worker is set but projectConfig.redisUrl is not — no jobs will run",
      );
    }
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
        return { status: "not configured", data: {} };
      }
    };
  }

  return instances;
}

export type { ServiceInstances } from "./types";
export * from "./logger";
export * from "./database";
export * from "./redis";
export * from "./moduleService";
