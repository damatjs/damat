// Import the shared setup FIRST so runTypeCheck snapshots the spawn dispatcher
// + node:fs mock instead of the real ones.
import {
  state,
  spawnCalls,
  resetMocks,
  setSpawnHandler,
} from "./setup";
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { createMockLogger, fakeSpawnResult } from "./helpers";
import type { ILogger } from "@damatjs/logger";

const { runTypeCheck } = await import("../shared/typecheck");

beforeEach(resetMocks);
afterEach(() => {
  resetMocks();
  // Restore the default push+exit-code handler so a per-test override (the
  // throwing handler below) never leaks into sibling tests.
  setSpawnHandler((opts) => {
    spawnCalls.push(opts);
    return fakeSpawnResult(state.spawnExitCode);
  });
});

const logger = () => createMockLogger() as unknown as ILogger & {
  info: ReturnType<typeof createMockLogger>["info"];
  error: ReturnType<typeof createMockLogger>["error"];
};

describe("runTypeCheck", () => {
  it("returns 0 immediately when skipped", async () => {
    const log = logger();
    const code = await runTypeCheck({ cwd: "/p", logger: log, skip: true });
    expect(code).toBe(0);
    expect(spawnCalls).toHaveLength(0);
  });

  it("returns 0 and skips when there is no tsconfig.json", async () => {
    state.existsDefault = false;
    const log = logger();
    const code = await runTypeCheck({ cwd: "/p", logger: log });
    expect(code).toBe(0);
    expect(log.info).toHaveBeenCalledWith(
      "No tsconfig.json found — skipping type-check",
    );
    expect(spawnCalls).toHaveLength(0);
  });

  it("spawns `bunx tsc --noEmit` and returns its exit code", async () => {
    state.existsMap = { "/p/tsconfig.json": true };
    state.spawnExitCode = 0;
    const log = logger();
    const code = await runTypeCheck({ cwd: "/p", logger: log, label: "app" });
    expect(code).toBe(0);
    expect(spawnCalls[0]!.cmd).toEqual(["bunx", "tsc", "--noEmit"]);
    expect(log.info).toHaveBeenCalledWith("Type-checking app...");
  });

  it("logs an abort message and returns the non-zero tsc code", async () => {
    state.existsMap = { "/p/tsconfig.json": true };
    state.spawnExitCode = 2;
    const log = logger();
    const code = await runTypeCheck({ cwd: "/p", logger: log });
    expect(code).toBe(2);
    expect(log.error).toHaveBeenCalledWith("Type check failed — aborting build");
  });

  it("returns 1 with a helpful message when the type-checker cannot launch", async () => {
    state.existsMap = { "/p/tsconfig.json": true };
    setSpawnHandler(() => {
      throw new Error("spawn failed");
    });
    const log = logger();
    const code = await runTypeCheck({ cwd: "/p", logger: log });
    expect(code).toBe(1);
    expect(log.error).toHaveBeenCalled();
  });
});
