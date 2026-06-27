// Import the shared setup FIRST so the command source snapshots the no-op
// @damatjs/load-env mock (the handler calls loadEnv before checking DATABASE_URL)
// and the full node:fs surface. See setup.ts for the full rationale.
import "./setup";
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { createContext } from "./helpers";
// Capture the REAL @damatjs/module before mocking, then spread it so only
// runModuleMigration is replaced — a narrow mock would strip exports siblings
// rely on. Same pattern as codegen.test's @damatjs/codegen / @damatjs/orm-cli.
import * as realModule from "@damatjs/module";

const mm = {
  result: {} as Awaited<ReturnType<typeof realModule.runModuleMigration>>,
  calls: [] as string[],
};

mock.module("@damatjs/module", () => ({
  ...realModule,
  runModuleMigration: async (packageDir: string) => {
    mm.calls.push(packageDir);
    return mm.result;
  },
}));

async function getCmd() {
  return (await import("../module/migrationRun")).moduleMigrationRunCommand;
}

const ORIGINAL_DB_URL = process.env.DATABASE_URL;

beforeEach(() => {
  mm.calls = [];
  mm.result = {
    moduleName: "demo",
    applied: [],
    pending: [],
    success: true,
    hadMigrations: true,
  };
  delete process.env.DATABASE_URL;
});

afterEach(() => {
  if (ORIGINAL_DB_URL === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = ORIGINAL_DB_URL;
});

describe("damat module migration:run command", () => {
  it("has the expected wiring", async () => {
    const c = await getCmd();
    expect(c.name).toBe("migration:run");
    expect(typeof c.handler).toBe("function");
  });

  it("errors and does not connect when DATABASE_URL is unset", async () => {
    // DATABASE_URL deleted in beforeEach — the guard short-circuits the run.
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(mm.calls).toHaveLength(0);
  });

  it("hints to create a migration first when the module has none", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    mm.result = {
      moduleName: "demo",
      applied: [],
      pending: [],
      success: true,
      hadMigrations: false,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalled();
    // The module dir is the cwd we pass straight through.
    expect(mm.calls).toEqual(["/project"]);
  });

  it("reports applied migrations on success", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    mm.result = {
      moduleName: "demo",
      applied: ["Migration20260101000000_Initial"],
      pending: ["Migration20260101000000_Initial"],
      success: true,
      hadMigrations: true,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.success).toHaveBeenCalled();
  });

  it("reports 'no pending migrations' when nothing was applied", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    // applied empty but hadMigrations true → already up to date.
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.info).toHaveBeenCalled();
    expect(logger.success).not.toHaveBeenCalled();
  });

  it("fails when a migration errors", async () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/postgres";
    mm.result = {
      moduleName: "demo",
      applied: [],
      pending: ["Migration20260101000000_Initial"],
      success: false,
      error: new Error("boom"),
      hadMigrations: true,
    };
    const cmd = await getCmd();
    const { ctx, logger } = createContext({}, { args: [], cwd: "/project" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
