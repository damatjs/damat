import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

// Wiring test: initializeServices must build the auth runtime (when
// services.auth is set), stash it on instances, and register an "auth"
// shutdown handler that calls the provider's shutdown. The adapter + core are
// mocked (they're tested for real in their own packages); here we test the
// framework glue.

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
mock.module("@damatjs/deps/ioredis", () => ({ Redis: FakeRedis, default: FakeRedis }));

// Use the REAL @damatjs/auth core (createAuthHandlers works fine) and a
// UNIQUELY-named fake adapter so this file's mocks never collide with
// auth.test.ts's (mock.module is process-global; both files run in one process).
const adapterState = { shutdownCalls: 0, hasShutdown: true };
mock.module("@damatjs/auth-wire", () => ({
  default: () => ({
    name: "wire",
    authenticate: async () => null,
    ...(adapterState.hasShutdown
      ? {
          shutdown: async () => {
            adapterState.shutdownCalls++;
          },
        }
      : {}),
  }),
}));

const { initializeServices } = await import("../../services/index");
const { clearModules } = await import("../../services/moduleService");
const { setGlobalLoggerInstance, clearGlobalLogger } = await import("../../services/logger");
const { setLinkModuleResolver } = await import("@damatjs/link");

import type { AppConfig } from "../../config";

const recordingLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
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

function config(auth?: unknown): AppConfig {
  return {
    projectConfig: { http: { port: 3000, host: "localhost" }, nodeEnv: "test" },
    ...(auth ? { services: { auth } } : {}),
  } as AppConfig;
}

beforeEach(() => {
  adapterState.shutdownCalls = 0;
  adapterState.hasShutdown = true;
  clearModules();
  setGlobalLoggerInstance(recordingLogger as never);
});

afterEach(() => {
  clearModules();
  setLinkModuleResolver(null as never);
  clearGlobalLogger();
});

describe("initializeServices — auth", () => {
  it("does not build auth when services.auth is unset", async () => {
    const instances = await initializeServices(config());
    expect(instances.auth).toBeUndefined();
    expect(instances.shutdownHandlers.some((h) => h.name === "auth")).toBe(false);
  });

  it("builds the auth runtime and registers an auth shutdown handler that shuts the provider down", async () => {
    const instances = await initializeServices(config({ provider: "wire" }));
    expect(instances.auth).toBeDefined();
    expect(typeof instances.auth!.handlers.session).toBe("function");

    const authHandler = instances.shutdownHandlers.find((h) => h.name === "auth");
    expect(authHandler).toBeDefined();
    await authHandler!.handler();
    expect(adapterState.shutdownCalls).toBe(1);
  });

  it("registers no auth shutdown handler when the provider has none", async () => {
    adapterState.hasShutdown = false;
    const instances = await initializeServices(config({ provider: "wire" }));
    expect(instances.auth).toBeDefined();
    expect(instances.shutdownHandlers.some((h) => h.name === "auth")).toBe(false);
  });
});
