import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";

// The auth wiring dynamically imports @damatjs/auth (core) and the named
// adapter package. Mock the core's createAuthHandlers to return recording
// handlers, and register a fake adapter package the wiring can import by name.
const coreState = {
  provider: null as unknown,
  options: null as unknown,
};

mock.module("@damatjs/auth", () => ({
  createAuthHandlers: (provider: unknown, options: unknown) => {
    coreState.provider = provider;
    coreState.options = options;
    return {
      session: () => {},
      apiKey: () => {},
      flexible: () => {},
    };
  },
}));

// A fake adapter package. Its default export is the provider factory; it records
// the options it was built with and returns a provider with routes + shutdown.
const adapterState = {
  builtWith: null as unknown,
  routes: undefined as { basePath: string; handler: () => void } | undefined,
  shutdownCalls: 0,
};

mock.module("@damatjs/auth-fake", () => ({
  default: (options: Record<string, unknown>) => {
    adapterState.builtWith = options;
    return {
      name: "fake",
      authenticate: async () => null,
      ...(adapterState.routes ? { routes: adapterState.routes } : {}),
      shutdown: async () => {
        adapterState.shutdownCalls++;
      },
    };
  },
}));

// An adapter package whose default export isn't a function (error path).
mock.module("@damatjs/auth-nofactory", () => ({ notDefault: true }));

const { initAuth } = await import("../../services/auth");
const { PoolManager } = await import("@damatjs/services");

import type { AppConfig } from "../../config";

const logs: Array<{ level: string; message: string }> = [];
const logger = {
  info: (m: string) => logs.push({ level: "info", message: m }),
  warn: (m: string) => logs.push({ level: "warn", message: m }),
  error: (m: string) => logs.push({ level: "error", message: m }),
  debug: () => {},
} as never;

function config(auth?: unknown): AppConfig {
  return {
    projectConfig: { http: { port: 3000, host: "localhost" }, nodeEnv: "test" },
    ...(auth ? { services: { auth: auth as never } } : {}),
  } as AppConfig;
}

beforeEach(() => {
  logs.length = 0;
  coreState.provider = null;
  coreState.options = null;
  adapterState.builtWith = null;
  adapterState.routes = undefined;
  adapterState.shutdownCalls = 0;
  PoolManager.reset();
});

afterEach(() => {
  PoolManager.reset();
});

describe("initAuth", () => {
  it("returns null when services.auth is not set (nothing imported)", async () => {
    expect(await initAuth(config(), logger)).toBeNull();
  });

  it("builds the provider via the named adapter and returns the three handlers", async () => {
    const runtime = await initAuth(
      config({ provider: "fake", options: { secretKey: "k" } }),
      logger,
    );
    expect(runtime).not.toBeNull();
    expect(typeof runtime!.handlers.session).toBe("function");
    expect(typeof runtime!.handlers.apiKey).toBe("function");
    expect(typeof runtime!.handlers.flexible).toBe("function");
    expect(adapterState.builtWith).toMatchObject({ secretKey: "k" });
    // provider passed to createAuthHandlers
    expect((coreState.provider as { name: string }).name).toBe("fake");
  });

  it("passes onAuthenticated through to the core handlers", async () => {
    const hook = () => {};
    await initAuth(config({ provider: "fake", onAuthenticated: hook }), logger);
    expect(
      (coreState.options as { onAuthenticated: unknown }).onAuthenticated,
    ).toBe(hook);
  });

  it("injects the app pool into options when the database is initialized", async () => {
    const fakePool = { query: async () => ({ rows: [] }) };
    PoolManager.setup({
      pool: fakePool as never,
      logger,
      connectionManager: {} as never,
    });
    await initAuth(config({ provider: "fake" }), logger);
    expect((adapterState.builtWith as { database: unknown }).database).toBe(
      fakePool,
    );
  });

  it("does not inject a pool when the database is not initialized", async () => {
    await initAuth(config({ provider: "fake" }), logger);
    expect(
      (adapterState.builtWith as { database?: unknown }).database,
    ).toBeUndefined();
  });

  it("does not override an explicit database option", async () => {
    const fakePool = { query: async () => ({ rows: [] }) };
    PoolManager.setup({
      pool: fakePool as never,
      logger,
      connectionManager: {} as never,
    });
    await initAuth(
      config({ provider: "fake", options: { database: "EXPLICIT" } }),
      logger,
    );
    expect((adapterState.builtWith as { database: unknown }).database).toBe(
      "EXPLICIT",
    );
  });

  it("exposes mountRoutes only when the provider has routes", async () => {
    const noRoutes = await initAuth(config({ provider: "fake" }), logger);
    expect(noRoutes!.mountRoutes).toBeUndefined();

    adapterState.routes = { basePath: "/api/auth", handler: () => {} };
    const withRoutes = await initAuth(config({ provider: "fake" }), logger);
    expect(typeof withRoutes!.mountRoutes).toBe("function");
    // mounting calls app.all for the base + wildcard
    const calls: string[] = [];
    withRoutes!.mountRoutes!({
      all: (path: string) => calls.push(path),
    } as never);
    expect(calls).toEqual(["/api/auth/*", "/api/auth"]);
  });

  it("exposes shutdown that calls the provider's shutdown", async () => {
    const runtime = await initAuth(config({ provider: "fake" }), logger);
    await runtime!.shutdown!();
    expect(adapterState.shutdownCalls).toBe(1);
  });

  it("maps a short provider name to @damatjs/auth-<name>", async () => {
    // "fake" resolved to @damatjs/auth-fake (the mock above) — success proves the mapping.
    const runtime = await initAuth(config({ provider: "fake" }), logger);
    expect(runtime).not.toBeNull();
  });

  it("throws a clear install error when the adapter package is missing", async () => {
    await expect(
      initAuth(config({ provider: "ghost" }), logger),
    ).rejects.toThrow(
      /Auth provider "ghost" could not be loaded.*@damatjs\/auth-ghost/s,
    );
  });

  it("throws when the adapter has no default factory export", async () => {
    await expect(
      initAuth(config({ provider: "@damatjs/auth-nofactory" }), logger),
    ).rejects.toThrow(/no default export/);
  });
});
