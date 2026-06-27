// Import the shared setup FIRST so the command source snapshots the no-op
// @damatjs/load-env mock and the full node:fs surface. See setup.ts.
import "./setup";
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { createContext } from "./helpers";
// Capture the REAL @damatjs/module before mocking, then spread it so only
// runModuleMigrationStatus is replaced. Same pattern as migrationRun.test.
import * as realModule from "@damatjs/module";

const ms = {
  result: {} as Awaited<ReturnType<typeof realModule.runModuleMigrationStatus>>,
  calls: [] as string[],
  throws: null as Error | null,
};

mock.module("@damatjs/module", () => ({
  ...realModule,
  runModuleMigrationStatus: async (packageDir: string) => {
    ms.calls.push(packageDir);
    if (ms.throws) throw ms.throws;
    return ms.result;
  },
}));

async function getCmd() {
  return (await import("../module/migrationStatus")).moduleMigrationStatusCommand;
}

const ORIGINAL_DB_URL = process.env.DATABASE_URL;

beforeEach(() => {
  ms.calls = [];
  ms.throws = null;
  ms.result = {
    moduleName: "demo",
    applied: 0,
    pending: 0,
    migrations: [],
    hadMigrations: true,
  };
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  if (ORIGINAL_DB_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_DB_URL;
});

describe("damat module migration:status command", () => {
  it("has the expected wiring", async () => {
    const c = await getCmd();
    expect(c.name).toBe("migration:status");
    expect(typeof c.handler).toBe("function");
  });

  it("errors and does not connect when DATABASE_URL is unset", async () => {
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(ms.calls).toHaveLength(0);
  });

  it("hints to create a migration first when the module has none", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    ms.result = {
      moduleName: "demo",
      applied: 0,
      pending: 0,
      migrations: [],
      hadMigrations: false,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalled();
    expect(ms.calls).toEqual(["/project"]);
  });

  it("reports the headline via info and lists migrations when some are pending", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    ms.result = {
      moduleName: "demo",
      applied: 1,
      pending: 1,
      migrations: [
        { name: "Migration1_Initial", applied: true },
        { name: "Migration2_Widgets", applied: false },
      ],
      hadMigrations: true,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Pending > 0 → headline goes to info, not success.
    expect(logger.info).toHaveBeenCalled();
    // One applied (success) line + one pending (info) line below the headline.
    expect(logger.success).toHaveBeenCalledTimes(1);
  });

  it("reports the headline via success when everything is applied", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    ms.result = {
      moduleName: "demo",
      applied: 2,
      pending: 0,
      migrations: [
        { name: "Migration1_Initial", applied: true },
        { name: "Migration2_Widgets", applied: true },
      ],
      hadMigrations: true,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // Headline (success) + two applied lines (success) = 3 success calls.
    expect(logger.success).toHaveBeenCalledTimes(3);
  });

  it("fails when status cannot be read", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    ms.throws = new Error("connection refused");
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
