// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import {
  state,
  writeCalls,
  rmCalls,
  spawnSyncCalls,
  mockSpawnSync,
  resetMocks,
} from "./setup";
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
  test("--fresh strips .git/.github and starts a new history", async () => {
    const { result, logger } = runClone(["acme/service"], { fresh: true });
    expect((await result).exitCode).toBe(0);
    expect(rmCalls.some((c) => c.path === "/base/service/.git")).toBe(true);
    expect(rmCalls.some((c) => c.path === "/base/service/.github")).toBe(true);
    expect(spawned().slice(1)).toEqual([
      "git init -b main",
      "git add .",
      "git commit -m chore: bootstrap from acme/service",
    ]);
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes("fresh git history"),
      ),
    ).toBe(true);
  });

  test("--fresh warns when the new init fails (clone already succeeded)", async () => {
    // preflight ok, clone ok, init fails.
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      )
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      )
      .mockImplementationOnce(() => {
        throw new Error("git broke");
      });
    const { result, logger } = runClone(["acme/service"], { fresh: true });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not initialize"),
      ),
    ).toBe(true);
  });

  test("--name rewrites package.json preserving its indentation", async () => {
    state.existsMap["/base/service/package.json"] = true;
    state.readFileMap["/base/service/package.json"] =
      `{\n    "name": "old",\n    "version": "1.0.0"\n}\n`;
    const { result, logger } = runClone(["acme/service"], { name: "renamed" });
    expect((await result).exitCode).toBe(0);
    const write = writeCalls.find(
      (c) => c.path === "/base/service/package.json",
    )!;
    expect(write.content).toContain('    "name": "renamed"');
    expect(
      logger.success.mock.calls.some((c) => String(c[0]).includes('"renamed"')),
    ).toBe(true);
  });
});
