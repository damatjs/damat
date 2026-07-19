import { mock } from "bun:test";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../../services/types";
import {
  FakeEventRouter,
  FakeEventWorker,
  resetWorkers,
  workerState,
} from "./worker-runtime-fixture";
import { durabilityRuntimeMock } from "./durability-runtime-mock";
import { parseWakeup } from "./parse-wakeup-fixture";
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
  EVENT_WAKEUP_CHANNEL: "damat:events:wakeup",
  parseEventWakeup: parseWakeup,
  clearEventWakeupPublisher: () => {},
  configureEventWakeupPublisher: () => workerState.publishers.push("events"),
  getAllDurableEventDefinitions: () => [
    { name: "mail.sent", consumers: new Map([["audit", {}]]) },
  ],
}));
mock.module("@damatjs/durability", () =>
  durabilityRuntimeMock(state, FakeNotMigratedError),
);
mock.module("@damatjs/jobs/migrations", () => ({
  jobsSystemMigrations: { migrations: [{ id: "jobs" }] },
}));
mock.module("@damatjs/events/migrations", () => ({
  eventsSystemMigrations: { migrations: [{ id: "events" }] },
}));
export const sharedPool = { query: async () => ({ rows: [] }) };
let managedPool: unknown = sharedPool;
mock.module("@damatjs/services", () => ({
  PoolManager: {
    setup: ({ pool }: { pool: unknown }) => void (managedPool = pool),
    reset: () => void (managedPool = undefined),
    isInitialized: () => managedPool !== undefined,
    getPool: () => managedPool ?? sharedPool,
  },
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
  managedPool = sharedPool;
  state.broadcasts.length = 0;
  resetWorkers();
  state.durabilityClients.length = 0;
  state.readiness.length = 0;
  state.readinessError = undefined;
  state.warnings.length = 0;
}
