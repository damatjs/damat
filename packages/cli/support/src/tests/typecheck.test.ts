import { beforeEach, describe, expect, test } from "bun:test";
import { resetSupportMocks, spawnCalls, state } from "./setup";
import { createTestLogger } from "./logger";
import { runTypeCheck } from "../runTypeCheck";

beforeEach(resetSupportMocks);

describe("runTypeCheck", () => {
  test("skips when requested", async () => {
    expect(
      await runTypeCheck({
        cwd: "/app",
        logger: createTestLogger(),
        skip: true,
      }),
    ).toBe(0);
    expect(spawnCalls).toEqual([]);
  });

  test("skips a project without tsconfig", async () => {
    const logger = createTestLogger();
    expect(await runTypeCheck({ cwd: "/app", logger })).toBe(0);
    expect(logger.info).toHaveBeenCalledWith(
      "No tsconfig.json found — skipping type-check",
    );
  });

  test("returns the type-check process result", async () => {
    state.exists = true;
    const logger = createTestLogger();
    expect(await runTypeCheck({ cwd: "/app", logger, label: "app" })).toBe(0);
    expect(spawnCalls[0]?.cmd).toEqual([
      process.execPath,
      "x",
      "tsc",
      "--noEmit",
    ]);
    expect(logger.info).toHaveBeenCalledWith("Type-checking app...");
  });

  test("reports a non-zero type-check result", async () => {
    state.exists = true;
    state.spawnExitCode = 2;
    const logger = createTestLogger();
    expect(await runTypeCheck({ cwd: "/app", logger })).toBe(2);
    expect(logger.error).toHaveBeenCalledWith(
      "Type check failed — aborting build",
    );
  });

  test("maps launch failures to exit code one", async () => {
    state.exists = true;
    state.spawnError = true;
    const logger = createTestLogger();
    expect(await runTypeCheck({ cwd: "/app", logger })).toBe(1);
    expect(logger.error).toHaveBeenCalled();
  });
});
