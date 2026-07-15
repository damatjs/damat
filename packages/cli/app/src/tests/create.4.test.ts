// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { state, writeCalls, spawnSyncCalls, mockSpawnSync, resetMocks } from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { createCommand } from "../commands/create";
import { createContext } from "./helpers";

beforeEach(() => {
  resetMocks();
});

const runCreate = (args: string[], options: Record<string, unknown> = {}) => {
  const { ctx, logger } = createContext(
    { git: true, install: true, ...options },
    { args, cwd: "/base" } as never,
  );
  return { result: createCommand.handler(ctx), logger };
};

const _written = (suffix: string) =>
  writeCalls.find((c) => c.path.endsWith(suffix));

describe("damat create — git/install flags and failures", () => {
  test("--no-git and --no-install skip both spawns", async () => {
    const { result } = runCreate(["my-api"], { git: false, install: false });
    expect((await result).exitCode).toBe(0);
    expect(spawnSyncCalls).toHaveLength(0);
  });

  test("git missing entirely: precise warn, repository init skipped, scaffold still succeeds", async () => {
    state.spawnSyncResult = { status: 1, stdout: "", stderr: "" }; // `git --version` fails
    const { result, logger } = runCreate(["my-api"], { install: false });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("git is not installed"),
      ),
    ).toBe(true);
    // Only the availability probe ran — no init/add/commit attempted.
    expect(spawnSyncCalls).toHaveLength(1);
    expect(spawnSyncCalls[0]!.args).toEqual(["--version"]);
  });

  test("a throwing availability probe is treated as git-missing, not a crash", async () => {
    mockSpawnSync.mockImplementationOnce(() => {
      throw new Error("ENOENT: git not found");
    });
    const { result, logger } = runCreate(["my-api"], { install: false });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("git is not installed"),
      ),
    ).toBe(true);
  });

  test("git present but init fails (e.g. unconfigured identity): generic warn, scaffold succeeds", async () => {
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      ) // --version
      .mockImplementationOnce(
        () => ({ status: 1, stdout: "", stderr: "bad identity" }) as never,
      );
    const { result, logger } = runCreate(["my-api"], { install: false });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not initialize git"),
      ),
    ).toBe(true);
    // (once-impls bypass the call recorder, so no spawn-count assertion here;
    // the `&&` short-circuit is covered by the happy-path sequence test.)
  });

  test("a failing bun install warns with manual instructions but exits 0", async () => {
    state.spawnSyncResult = { status: 1, stdout: "", stderr: "network down" };
    const { result, logger } = runCreate(["my-api"], { git: false });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("bun install failed"),
      ),
    ).toBe(true);
  });

});
