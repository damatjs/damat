// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { state, spawnSyncCalls, mockSpawnSync, resetMocks } from "./setup";
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

describe("damat clone — extras", () => {
  test("--name warns when there is no readable package.json", async () => {
    const { result, logger } = runClone(["acme/service"], { name: "renamed" });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("No readable")),
    ).toBe(true);

    resetMocks();
    state.existsMap["/base/service/package.json"] = true;
    state.readFileMap["/base/service/package.json"] = "{ not json";
    const second = runClone(["acme/service"], { name: "renamed" });
    expect((await second.result).exitCode).toBe(0);
    expect(
      second.logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("No readable"),
      ),
    ).toBe(true);
  });

  test("--install runs bun install and warns on failure", async () => {
    const { result, logger } = runClone(["acme/service"], { install: true });
    expect((await result).exitCode).toBe(0);
    expect(spawned()).toContain("bun install");
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes("Dependencies"),
      ),
    ).toBe(true);

    resetMocks();
    // preflight ok, clone ok, install fails.
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      )
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      )
      .mockImplementationOnce(
        () => ({ status: 1, stdout: "", stderr: "offline" }) as never,
      );
    const second = runClone(["acme/service"], { install: true });
    expect((await second.result).exitCode).toBe(0);
    expect(
      second.logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("bun install failed"),
      ),
    ).toBe(true);
  });
});
