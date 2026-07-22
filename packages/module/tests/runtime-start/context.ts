import { afterAll, beforeEach, mock } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { PoolManager } from "@damatjs/services";

let healthChecks = false;
let shutdownHandlers: { handler: () => Promise<void> | void }[] = [];
const testLogger = { info() {}, warn() {}, error() {}, debug() {} } as never;
const realServices = await import(
  Bun.resolveSync("@damatjs/framework/services", import.meta.dir)
);

export const initSpy = mock(async (config, _cwd, _runtime, options) => {
  const instances = {
    healthChecks: healthChecks
      ? { database: async () => ({ status: "ok", data: {} }) }
      : undefined,
    shutdownHandlers: shutdownHandlers.map((item, index) => ({
      ...item,
      name: `test-${index}`,
      phase: "postgres" as const,
    })),
  };
  await options?.beforeDurability?.({ config, instances, logger: testLogger });
  return instances;
});

mock.module("@damatjs/framework/services", () => ({
  ...realServices,
  initializeServices: initSpy,
}));

export const { startModuleApp } = await import("../../src/runtime/start");
export { PoolManager };
function fakePool() {
  const client = {
    query: mock(async () => ({ rows: [], rowCount: 0 })),
    release: mock(() => {}),
  };
  return {
    query: mock(async () => ({ rows: [], rowCount: 0 })),
    connect: mock(async () => client),
    end: mock(async () => {}),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  };
}

export function seedPool(): void {
  PoolManager.setup({
    pool: fakePool() as never,
    logger: testLogger,
    connectionManager: null as never,
  });
}

export function makeModulePackage(migrations = false): string {
  const root = mkdtempSync(join(tmpdir(), "damat-start-"));
  const src = join(root, "src");
  mkdirSync(src);
  writeFileSync(join(src, "index.ts"), "export default {};\n");
  writeFileSync(
    join(src, "module.json"),
    JSON.stringify({ name: "widget", version: "2.1.0" }),
  );
  if (migrations) mkdirSync(join(src, "migrations"));
  return root;
}

export function enableHealthChecks(): void {
  healthChecks = true;
}

export function useShutdownHandlers(handlers: typeof shutdownHandlers): void {
  shutdownHandlers = handlers;
}

const ENV_KEYS = ["DATABASE_URL", "PORT", "HOST", "NODE_ENV"] as const;
const savedEnv = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

beforeEach(() => {
  healthChecks = false;
  shutdownHandlers = [];
  initSpy.mockClear();
  PoolManager.reset();
  for (const key of ENV_KEYS) delete process.env[key];
});

afterAll(() => {
  for (const key of ENV_KEYS) {
    const value = savedEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  PoolManager.reset();
});
