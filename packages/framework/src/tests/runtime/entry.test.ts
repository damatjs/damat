import { expect, test } from "bun:test";
import { start } from "../../entry";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../../services";

function config(mode: "server" | "all", grace = 25): AppConfig {
  return {
    projectConfig: { http: { port: 3000 } },
    runtime: { mode, shutdownGraceMs: grace },
    services: { jobs: {} },
  };
}

test("entry composes worker startup without building HTTP", async () => {
  const order: string[] = [];
  const appConfig = config("all");
  appConfig.hooks = {
    beforeServices: () => void order.push("before"),
    afterServices: () => void order.push("after"),
  };
  const services: ServiceInstances = {
    shutdownHandlers: [{ name: "claims", phase: "claims", handler: () => {} }],
  };
  await start(
    "/app",
    { DAMAT_RUNTIME_MODE: "worker", DAMAT_WORKER_TYPES: "jobs" },
    {
      loadConfigAsync: async () => {
        order.push("load");
        return appConfig;
      },
      initLogger: () => ({}) as never,
      setupShutdownHandlers: (_logger, options) =>
        void order.push(`signals:${options.graceMs}`),
      initializeServices: async (_config, cwd, runtime) => {
        order.push(`initialize:${cwd}:${runtime.mode}:${runtime.workers}`);
        return services;
      },
      registerShutdown: (handler) => order.push(`register:${handler.name}`),
      startHttpRuntime: async () => {
        order.push("http");
        return { close: async () => {} };
      },
    },
  );
  expect(order).toEqual([
    "load",
    "before",
    "signals:25",
    "initialize:/app:worker:jobs",
    "after",
    "register:claims",
  ]);
});

test("entry starts HTTP only for a serving runtime", async () => {
  const registered: string[] = [];
  await start(
    "/app",
    {},
    {
      loadConfigAsync: async () => config("server"),
      initLogger: () => ({}) as never,
      setupShutdownHandlers: () => {},
      initializeServices: async () => ({ shutdownHandlers: [] }),
      registerShutdown: (handler) => registered.push(handler.name),
      startHttpRuntime: async () => ({ close: async () => {} }),
    },
  );
  expect(registered).toEqual(["http"]);
});

test("entry rejects invalid grace before service initialization", async () => {
  let initialized = false;
  await expect(
    start(
      "/app",
      {},
      {
        loadConfigAsync: async () => config("server", -1),
        initializeServices: async () => {
          initialized = true;
          return { shutdownHandlers: [] };
        },
      },
    ),
  ).rejects.toThrow("shutdownGraceMs must be between 0 and 2147483647");
  expect(initialized).toBe(false);
});
