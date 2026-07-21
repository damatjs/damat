import { beforeEach, describe, expect, it } from "bun:test";
import { createContext } from "../helpers";
import { resetMocks, spawnSyncCalls, state, writeCalls } from "../setup";
import { resetHandlerFixture } from "./fixture";

beforeEach(resetHandlerFixture);

const command = async () =>
  (await import("../../commands/module/init")).moduleInitCommand;

function context(options: Record<string, unknown>) {
  return createContext(
    {
      databaseUrl: "postgres://postgres:postgres@localhost/my_module",
      ...options,
    },
    { args: ["my-module"], cwd: "/m" },
  );
}

describe("module init database bootstrap", () => {
  it("installs and prepares an explicitly selected database", async () => {
    const url = "postgres://u:secret@localhost/module_db";
    const { ctx } = context({
      install: true,
      databaseSetup: true,
      databaseUrl: url,
    });
    expect((await (await command()).handler(ctx)).exitCode).toBe(0);
    expect(spawnSyncCalls.map(({ cmd, args }) => [cmd, ...args])).toEqual([
      ["bun", "install"],
      ["bun", "run", "database:setup"],
    ]);
    const env = writeCalls.find(({ path }) => path.endsWith("/.env"))?.content;
    expect(env).toContain(url);
  });

  it("reports invalid database URLs before writing files", async () => {
    const { ctx, logger } = context({ databaseUrl: "http://db/module" });
    expect((await (await command()).handler(ctx)).exitCode).toBe(1);
    expect(writeCalls).toHaveLength(0);
    expect(logger.error).toHaveBeenCalled();
  });

  it("keeps the scaffold when install fails and prints recovery steps", async () => {
    state.spawnSyncResults = [{ status: 1, stderr: "offline" }];
    const { ctx, logger } = context({ install: true, databaseSetup: true });
    expect((await (await command()).handler(ctx)).exitCode).toBe(0);
    expect(logger.warn).toHaveBeenCalled();
    expect(String(logger.info.mock.calls.at(-1)?.[0])).toContain("bun install");
  });

  it("fails cleanly when database setup fails or cannot spawn", async () => {
    state.spawnSyncResults = [{ status: 0 }, { status: 1 }];
    let current = context({ install: true, databaseSetup: true });
    expect((await (await command()).handler(current.ctx)).exitCode).toBe(1);
    expect(current.logger.error).toHaveBeenCalled();
    resetMocks();
    state.spawnSyncErrors = [true];
    current = context({ install: true, databaseSetup: true });
    expect((await (await command()).handler(current.ctx)).exitCode).toBe(0);
    expect(current.logger.warn).toHaveBeenCalled();
  });
});
