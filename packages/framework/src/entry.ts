import { loadConfigAsync } from "./config";
import {
  resolveRuntime,
  resolveShutdownGraceMs,
  startHttpRuntime,
  startResolvedRuntime,
  type RuntimeEnvironment,
} from "./runtime";
import { initLogger, initializeServices } from "./services";
import { registerShutdown, setupShutdownHandlers } from "./shutdown";

export interface EntryDependencies {
  loadConfigAsync: typeof loadConfigAsync;
  initializeServices: typeof initializeServices;
  startHttpRuntime: typeof startHttpRuntime;
  initLogger: typeof initLogger;
  setupShutdownHandlers: typeof setupShutdownHandlers;
  registerShutdown: typeof registerShutdown;
}

const defaultDependencies: EntryDependencies = {
  loadConfigAsync,
  initializeServices,
  startHttpRuntime,
  initLogger,
  setupShutdownHandlers,
  registerShutdown,
};

export async function start(
  cwd: string = process.cwd(),
  environment: RuntimeEnvironment = process.env,
  overrides: Partial<EntryDependencies> = {},
): Promise<void> {
  const dependencies = { ...defaultDependencies, ...overrides };
  const config = await dependencies.loadConfigAsync(cwd);
  const runtime = resolveRuntime(config, environment);
  const graceMs = resolveShutdownGraceMs(config.runtime?.shutdownGraceMs);
  const logger = dependencies.initLogger(config.projectConfig.loggerConfig);
  await config.hooks?.beforeServices?.({
    config: config.projectConfig,
    logger,
  });
  dependencies.setupShutdownHandlers(
    logger,
    graceMs === undefined ? {} : { graceMs },
  );
  await startResolvedRuntime(runtime, {
    initialize: async (resolvedRuntime) => {
      const services = await dependencies.initializeServices(
        config,
        cwd,
        resolvedRuntime,
      );
      await config.hooks?.afterServices?.({
        config: config.projectConfig,
        logger,
      });
      return services;
    },
    startHttp: (services) =>
      dependencies.startHttpRuntime(config, cwd, services),
    register: dependencies.registerShutdown,
  });
}

export async function runEntry(
  startApplication: () => Promise<void> = start,
): Promise<void> {
  try {
    await startApplication();
  } catch (e) {
    console.error("Failed to start runtime:", e);
    process.exit(1);
  }
}
