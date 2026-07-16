import { mock } from "bun:test";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../../services/types";

export const state = {
  broadcasts: [] as unknown[],
  workers: [] as unknown[],
  started: 0,
  stopped: 0,
  durabilityClients: [] as unknown[],
  warnings: [] as string[],
};

class FakeJobWorker {
  constructor(options: unknown) {
    state.workers.push(options);
  }
  start() {
    state.started++;
  }
  async stop() {
    state.stopped++;
  }
}

mock.module("@damatjs/events", () => ({
  connectEventBroadcast: async (value: unknown) => state.broadcasts.push(value),
  disconnectEventBroadcast: async () => {},
}));
mock.module("@damatjs/jobs", () => ({ JobWorker: FakeJobWorker }));
mock.module("@damatjs/durability", () => ({
  createDurabilityClient: ({ pool }: { pool: unknown }) => ({ pool }),
  setDurabilityClient: (client: unknown) =>
    state.durabilityClients.push(client),
}));
mock.module("@damatjs/services", () => ({
  PoolManager: { getPool: () => ({ query: async () => ({ rows: [] }) }) },
}));

export const { initializeEventBroadcast } =
  await import("../../services/initialize/events");
export const { initializeJobs } =
  await import("../../services/initialize/jobs");

export const logger = {
  debug: () => {},
  info: () => {},
  warn: (message: string) => state.warnings.push(message),
  error: () => {},
  fatal: () => {},
  waiting: () => {},
  progress: () => {},
  cached: () => {},
  success: () => {},
  skip: () => {},
  child: () => logger,
  withPrefix: () => logger,
  request: () => {},
};

export function config(): AppConfig {
  return {
    projectConfig: {
      http: { port: 3000, host: "localhost" },
      databaseUrl: "postgres://test",
      redisUrl: "redis://test",
    },
  };
}

export function instances(): ServiceInstances {
  return { healthChecks: {}, shutdownHandlers: [] };
}

export function reset(): void {
  state.broadcasts.length = 0;
  state.workers.length = 0;
  state.started = 0;
  state.stopped = 0;
  state.durabilityClients.length = 0;
  state.warnings.length = 0;
}
