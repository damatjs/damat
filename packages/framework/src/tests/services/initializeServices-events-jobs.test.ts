import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Boundary fakes, following initializeServices-db-redis.test.ts:
//
// - `@damatjs/deps/ioredis` is the OS/network boundary the redis service
//   bottoms out at (the events/jobs paths require `projectConfig.redisUrl`,
//   which boots the real redis service first).
// - `@damatjs/events` / `@damatjs/jobs` are mocked with recording fakes: the
//   transport and worker are tested for real in their own packages; here we
//   test the WIRING — when initializeServices connects/constructs them, with
//   which options, and which shutdown handlers it registers.
// ---------------------------------------------------------------------------

class FakeRedis {
  on() {
    return this;
  }
  async connect() {}
  async ping() {
    return "PONG";
  }
  async quit() {}
}

const broadcastState = {
  connectCalls: [] as unknown[],
  disconnectCalls: 0,
};

const workerState = {
  constructed: [] as unknown[],
  startCalls: 0,
  stopCalls: 0,
};

class FakeJobWorker {
  constructor(options: unknown = {}) {
    workerState.constructed.push(options);
  }
  start(): void {
    workerState.startCalls++;
  }
  async stop(): Promise<void> {
    workerState.stopCalls++;
  }
}

mock.module("@damatjs/deps/ioredis", () => ({ Redis: FakeRedis, default: FakeRedis }));

// Other packages (e.g. @damatjs/service) import more from these modules than
// the wiring under test — keep the real surface and override only what the
// wiring calls.
const realEvents = await import("@damatjs/events");
const realJobs = await import("@damatjs/jobs");
mock.module("@damatjs/events", () => ({
  ...realEvents,
  connectEventBroadcast: async (options: unknown) => {
    broadcastState.connectCalls.push(options);
  },
  disconnectEventBroadcast: async () => {
    broadcastState.disconnectCalls++;
  },
}));
mock.module("@damatjs/jobs", () => ({ ...realJobs, JobWorker: FakeJobWorker }));

const { initializeServices } = await import("../../services/index");
const { disconnectRedis, hasRedis } = await import("../../services/redis");
const { clearModules } = await import("../../services/moduleService");
const { setGlobalLoggerInstance, clearGlobalLogger } = await import("../../services/logger");
const { setLinkModuleResolver } = await import("@damatjs/link");

import type { AppConfig } from "../../config";

const SCRATCH = tmpdir();

// Recording logger so the warn-and-skip paths are assertable.
const logCalls: Array<{ level: string; message: string }> = [];
const record = (level: string) => (message: string) => {
  logCalls.push({ level, message });
};
const recordingLogger = {
  debug: record("debug"),
  info: record("info"),
  warn: record("warn"),
  error: record("error"),
  fatal: () => {},
  waiting: () => {},
  progress: () => {},
  cached: () => {},
  success: () => {},
  skip: () => {},
  child: () => recordingLogger,
  withPrefix: () => recordingLogger,
  request: () => {},
  close: () => {},
};

const warns = () => logCalls.filter((c) => c.level === "warn").map((c) => c.message);

function config(project: Partial<AppConfig["projectConfig"]> = {}): AppConfig {
  return {
    projectConfig: {
      http: { port: 3000, host: "localhost" },
      nodeEnv: "test",
      ...project,
    },
  };
}

const REDIS = { redisUrl: "redis://localhost:6379" };

beforeEach(() => {
  logCalls.length = 0;
  broadcastState.connectCalls.length = 0;
  broadcastState.disconnectCalls = 0;
  workerState.constructed.length = 0;
  workerState.startCalls = 0;
  workerState.stopCalls = 0;
  clearModules();
  setGlobalLoggerInstance(recordingLogger as never);
});

afterEach(async () => {
  if (hasRedis()) await disconnectRedis();
  clearModules();
  setLinkModuleResolver(null as never);
  clearGlobalLogger();
});

describe("initializeServices — services.events.broadcast", () => {
  it("connects the broadcast and registers an 'event-broadcast' shutdown handler (with redisUrl)", async () => {
    const cfg = config(REDIS);
    cfg.services = { events: { broadcast: true } };

    const instances = await initializeServices(cfg, SCRATCH);

    expect(broadcastState.connectCalls).toEqual([{}]); // no channel → default
    expect(instances.shutdownHandlers.map((h) => h.name)).toEqual([
      "redis",
      "event-broadcast",
      "logger",
    ]);

    // The shutdown handler disconnects the transport.
    await instances.shutdownHandlers.find((h) => h.name === "event-broadcast")!.handler();
    expect(broadcastState.disconnectCalls).toBe(1);
    expect(logCalls).toContainEqual({ level: "info", message: "Event broadcast disconnected" });
  });

  it("passes a custom channel through to connectEventBroadcast", async () => {
    const cfg = config(REDIS);
    cfg.services = { events: { broadcast: true, channel: "my-app-events" } };

    await initializeServices(cfg, SCRATCH);

    expect(broadcastState.connectCalls).toEqual([{ channel: "my-app-events" }]);
  });

  it("warns and stays in-process when redisUrl is missing", async () => {
    const cfg = config(); // no redisUrl
    cfg.services = { events: { broadcast: true } };

    const instances = await initializeServices(cfg, SCRATCH);

    expect(broadcastState.connectCalls).toHaveLength(0);
    expect(instances.shutdownHandlers.map((h) => h.name)).toEqual(["logger"]);
    expect(warns()).toContain(
      "services.events.broadcast is set but projectConfig.redisUrl is not — events stay in-process",
    );
  });

  it("does not touch the broadcast when services.events is not configured", async () => {
    const instances = await initializeServices(config(REDIS), SCRATCH);

    expect(broadcastState.connectCalls).toHaveLength(0);
    expect(instances.shutdownHandlers.map((h) => h.name)).toEqual(["redis", "logger"]);
  });
});

describe("initializeServices — services.jobs.worker", () => {
  it("constructs, starts, and registers a 'job-worker' shutdown handler (with redisUrl)", async () => {
    const cfg = config(REDIS);
    cfg.services = {
      jobs: { worker: true, queueName: "mailers", concurrency: 3, pollIntervalMs: 25 },
    };

    const instances = await initializeServices(cfg, SCRATCH);

    // Options are passed through verbatim.
    expect(workerState.constructed).toEqual([
      { queueName: "mailers", concurrency: 3, pollIntervalMs: 25 },
    ]);
    expect(workerState.startCalls).toBe(1);
    expect(instances.shutdownHandlers.map((h) => h.name)).toEqual([
      "redis",
      "job-worker",
      "logger",
    ]);

    // The shutdown handler stops the worker.
    await instances.shutdownHandlers.find((h) => h.name === "job-worker")!.handler();
    expect(workerState.stopCalls).toBe(1);
  });

  it("omits unset worker options so the worker's own defaults apply", async () => {
    const cfg = config(REDIS);
    cfg.services = { jobs: { worker: true } };

    await initializeServices(cfg, SCRATCH);

    expect(workerState.constructed).toEqual([{}]);
    expect(workerState.startCalls).toBe(1);
  });

  it("warns and starts no worker when redisUrl is missing", async () => {
    const cfg = config(); // no redisUrl
    cfg.services = { jobs: { worker: true } };

    const instances = await initializeServices(cfg, SCRATCH);

    expect(workerState.constructed).toHaveLength(0);
    expect(workerState.startCalls).toBe(0);
    expect(instances.shutdownHandlers.map((h) => h.name)).toEqual(["logger"]);
    expect(warns()).toContain(
      "services.jobs.worker is set but projectConfig.redisUrl is not — no jobs will run",
    );
  });

  it("does not construct a worker when services.jobs is not configured", async () => {
    await initializeServices(config(REDIS), SCRATCH);

    expect(workerState.constructed).toHaveLength(0);
  });
});

describe("initializeServices — events + jobs together", () => {
  it("registers redis, event-broadcast, job-worker, and logger handlers in order", async () => {
    const cfg = config(REDIS);
    cfg.services = {
      events: { broadcast: true },
      jobs: { worker: true },
    };

    const instances = await initializeServices(cfg, SCRATCH);

    expect(instances.shutdownHandlers.map((h) => h.name)).toEqual([
      "redis",
      "event-broadcast",
      "job-worker",
      "logger",
    ]);
    expect(broadcastState.connectCalls).toHaveLength(1);
    expect(workerState.startCalls).toBe(1);
  });
});
