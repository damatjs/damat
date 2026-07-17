import { mock } from "bun:test";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../../services/types";
import {
  FakeEventRouter,
  FakeEventWorker,
  resetWorkers,
  workerState,
} from "./worker-runtime-fixture";
export const state = {
  broadcasts: [] as unknown[],
  durabilityClients: [] as unknown[],
  readiness: [] as unknown[],
  readinessError: undefined as Error | undefined,
  warnings: [] as string[],
};
export { workerState };
export class FakeNotMigratedError extends Error {}
mock.module("@damatjs/events", () => ({
  connectEventBroadcast: async (value: unknown) => state.broadcasts.push(value),
  disconnectEventBroadcast: async () => {},
  DurableEventRouter: FakeEventRouter,
  DurableEventWorker: FakeEventWorker,
  configureEventWakeupPublisher: () => workerState.publishers.push("events"),
  getAllDurableEventDefinitions: () => [
    { name: "mail.sent", consumers: new Map([["audit", {}]]) },
  ],
}));
mock.module("@damatjs/durability", () => ({
  DurableInfrastructureNotMigratedError: FakeNotMigratedError,
  createDurabilityClient: ({ pool }: { pool: unknown }) => ({ pool }),
  setDurabilityClient: (client: unknown) =>
    state.durabilityClients.push(client),
  assertSystemMigrationsApplied: async (
    _client: unknown,
    migrations: unknown,
  ) => {
    state.readiness.push(migrations);
    if (state.readinessError) throw state.readinessError;
  },
  collectSystemMigrations: (catalogs: Array<{ migrations: unknown[] }>) =>
    catalogs.flatMap(({ migrations }) => migrations),
  durabilitySystemMigrations: { migrations: [{ id: "shared" }] },
}));
mock.module("@damatjs/jobs/migrations", () => ({
  jobsSystemMigrations: { migrations: [{ id: "jobs" }] },
}));
mock.module("@damatjs/events/migrations", () => ({
  eventsSystemMigrations: { migrations: [{ id: "events" }] },
}));
mock.module("@damatjs/services", () => ({
  PoolManager: { getPool: () => ({ query: async () => ({ rows: [] }) }) },
}));
export const { initializeEventBroadcast } =
  await import("../../services/initialize/events");
export const { initializeJobs } =
  await import("../../services/initialize/jobs");
export const { initializeDurability } =
  await import("../../services/initialize/durability");
export const { initializeDurableEvents } =
  await import("../../services/initialize/events");
export const { startWorkers } = await import("../../runtime/startWorkers");
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
    },
  };
}

export function instances(): ServiceInstances {
  return { healthChecks: {}, shutdownHandlers: [] };
}

export function reset(): void {
  state.broadcasts.length = 0;
  resetWorkers();
  state.durabilityClients.length = 0;
  state.readiness.length = 0;
  state.readinessError = undefined;
  state.warnings.length = 0;
}
