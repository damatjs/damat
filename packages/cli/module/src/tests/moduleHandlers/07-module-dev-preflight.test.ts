import { beforeEach as registerReset } from "bun:test";
import type { ModuleRuntimePlan } from "@damatjs/module";
import { resetContext } from "./context";
registerReset(resetContext);

import { createContext, describe, expect, it, mock } from "./context";

function plan(requiresDatabase: boolean): ModuleRuntimePlan {
  return {
    packageDir: "/module",
    moduleDir: "/module",
    manifest: { name: "demo" },
    moduleConfig: {},
    capabilities: {
      models: requiresDatabase,
      migrations: false,
      jobs: false,
      events: false,
      pipelines: false,
      durable: false,
      requiresDatabase,
      workers: [],
    },
    config: {
      projectConfig: {
        databaseUrl: requiresDatabase ? "postgres://localhost/demo" : undefined,
        http: { host: "127.0.0.1", port: 17662 },
      },
    },
    routeBasePath: "/api",
  } as ModuleRuntimePlan;
}

function dependencies(runtimePlan: ModuleRuntimePlan, created = false) {
  const calls: string[] = [];
  return {
    calls,
    value: {
      resolve: mock(async () => {
        calls.push("resolve");
        return runtimePlan;
      }),
      assertPort: mock(async () => void calls.push("port")),
      assertDatabase: mock(() => void calls.push("database")),
      ensure: mock(async () => {
        calls.push("ensure");
        return { created } as never;
      }),
    },
  };
}

describe("module dev preflight", () => {
  const get = async () =>
    (await import("../../commands/module/devPreflight")).preflightModuleDev;

  it("checks the port and skips PostgreSQL for service-only modules", async () => {
    const deps = dependencies(plan(false));
    const { logger } = createContext({});
    await (
      await get()
    )("/module", 17662, logger as never, deps.value);
    expect(deps.calls).toEqual(["resolve", "port", "database"]);
    expect(deps.value.resolve).toHaveBeenCalledWith({
      packageDir: "/module",
      port: 17662,
    });
    expect(deps.value.assertPort).toHaveBeenCalledWith(17662, "127.0.0.1");
  });

  it.each([true, false])(
    "reports PostgreSQL preflight (created=%s)",
    async (created) => {
      const deps = dependencies(plan(true), created);
      const { logger } = createContext({});
      await (
        await get()
      )("/module", undefined, logger as never, deps.value);
      expect(deps.calls).toEqual(["resolve", "port", "database", "ensure"]);
      expect(created ? logger.success : logger.info).toHaveBeenCalledTimes(1);
    },
  );
});
