// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { spawnSyncCalls, mockSpawnSync, resetMocks } from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { cloneCommand } from "../commands/clone";
import { createContext } from "./helpers";

beforeEach(() => {
  resetMocks();
});

const runClone = (args: string[], options: Record<string, unknown> = {}) => {
  const { ctx, logger } = createContext(
    { fresh: false, install: false, ...options },
    { args, cwd: "/base" } as never,
  );
  return { result: cloneCommand.handler(ctx), logger };
};

// The handler preflights git with `git --version` (requireGit); filter that
// out so assertions stay about the actual work.
const _spawned = () =>
  spawnSyncCalls
    .map((c) => [c.cmd, ...c.args].join(" "))
    .filter((line) => line !== "git --version");

// The mocked mkdtempSync returns `${prefix}XXXXXX`.
const _TEMP = `${join(tmpdir(), "damat-clone-")}XXXXXX`;

describe("damat clone — validation", () => {
  test("a spawn error mid-clone (git vanished) is reported plainly", async () => {
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      ) // preflight
      .mockImplementationOnce(
        () =>
          ({
            status: null,
            error: new Error("spawn git ENOENT"),
            stdout: "",
            stderr: "",
          }) as never,
      );
    const { result, logger } = runClone(["acme/service"]);
    expect((await result).exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("could not run git (spawn git ENOENT)"),
      ),
    ).toBe(true);
  });
});
