// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { state, spawnSyncCalls, resetMocks } from "./setup";
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
const spawned = () =>
  spawnSyncCalls
    .map((c) => [c.cmd, ...c.args].join(" "))
    .filter((line) => line !== "git --version");

// The mocked mkdtempSync returns `${prefix}XXXXXX`.
const _TEMP = `${join(tmpdir(), "damat-clone-")}XXXXXX`;

describe("damat clone — validation", () => {
  test("requires a source", async () => {
    const { result, logger } = runClone([]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(spawnSyncCalls).toHaveLength(0);
  });

  test("rejects an unparseable source", async () => {
    const { result, logger } = runClone(["no spaces allowed"]);
    expect((await result).exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Could not parse clone source"),
      ),
    ).toBe(true);
  });

  test("refuses an existing target directory", async () => {
    state.existsMap["/base/service"] = true;
    const { result, logger } = runClone(["acme/service"]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error.mock.calls[0]![0]).toContain("already exists");
    expect(spawned()).toHaveLength(0);
  });

  test("errors clearly up front when git is not installed — no fallback, no clone attempt", async () => {
    state.spawnSyncResult = { status: 1, stdout: "", stderr: "" }; // `git --version` fails
    const { result, logger } = runClone(["acme/service"]);
    expect((await result).exitCode).toBe(1);
    const message = String(logger.error.mock.calls[0]![0]);
    expect(message).toContain("git is required to clone repositories");
    expect(message).toContain("install git and re-run");
    // Only the preflight probe ran — nothing was downloaded any other way.
    expect(spawned()).toHaveLength(0);
    expect(spawnSyncCalls).toHaveLength(1);
  });
});
