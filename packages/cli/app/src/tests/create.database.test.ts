import { beforeEach, describe, expect, test } from "bun:test";
import { createCommand } from "../commands/create";
import { createContext } from "./helpers";
import { spawnSyncCalls, state, writeCalls, resetMocks } from "./setup";

beforeEach(resetMocks);

function run(options: Record<string, unknown>) {
  const { ctx, logger } = createContext(
    {
      git: false,
      install: true,
      databaseUrl: "postgres://postgres:postgres@localhost/my_api",
      ...options,
    },
    { args: ["my-api"], cwd: "/base" } as never,
  );
  return { result: createCommand.handler(ctx), logger };
}

const env = () =>
  writeCalls.find(({ path }) => path.endsWith("my-api/.env"))?.content;

describe("damat create database bootstrap", () => {
  test("writes an explicit URL, installs, creates, and migrates", async () => {
    const databaseUrl = "postgres://damat:secret@localhost:5432/custom";
    const { result, logger } = run({ databaseUrl, databaseSetup: true });
    expect((await result).exitCode).toBe(0);
    expect(env()).toContain(`DATABASE_URL=${JSON.stringify(databaseUrl)}`);
    expect(spawnSyncCalls.map(({ cmd, args }) => [cmd, ...args])).toEqual([
      ["bun", "install"],
      ["bun", "run", "db:setup"],
    ]);
    expect(
      logger.success.mock.calls.some((call) =>
        String(call[0]).includes("durable infrastructure are ready"),
      ),
    ).toBe(true);
  });

  test("returns an actionable failure when database setup fails", async () => {
    state.spawnSyncResults = [
      { status: 0, stdout: "", stderr: "" },
      { status: 1, stdout: "", stderr: "permission denied" },
    ];
    const { result, logger } = run({ databaseSetup: true });
    expect((await result).exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(
      logger.info.mock.calls.some((call) =>
        String(call[0]).includes("db:setup"),
      ),
    ).toBe(true);
  });

  test("rejects an invalid URL before writing the scaffold", async () => {
    const { result, logger } = run({ databaseUrl: "http://not-postgres/app" });
    expect((await result).exitCode).toBe(1);
    expect(writeCalls).toHaveLength(0);
    expect(logger.error).toHaveBeenCalled();
  });

  test("can defer setup while preserving the selected URL", async () => {
    const url = "postgres://u:p@localhost/deferred";
    const { result, logger } = run({
      databaseUrl: url,
      databaseSetup: false,
      install: false,
    });
    expect((await result).exitCode).toBe(0);
    expect(env()).toContain(url);
    expect(spawnSyncCalls).toHaveLength(0);
    expect(String(logger.info.mock.calls.at(-1)?.[0])).toContain("db:setup");
  });
});
