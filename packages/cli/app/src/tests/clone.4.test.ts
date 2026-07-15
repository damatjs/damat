// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { rmCalls, spawnSyncCalls, mockSpawnSync, resetMocks } from "./setup";
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

describe("damat clone — plain clone (git clone semantics)", () => {
  test("clones the URL into a dir derived from the repo name, keeping .git", async () => {
    const { result, logger } = runClone([
      "https://github.com/acme/service.git",
    ]);
    expect((await result).exitCode).toBe(0);
    expect(spawned()).toEqual([
      "git clone -- https://github.com/acme/service.git /base/service",
    ]);
    // No fresh-history spawns, no .git removal.
    expect(rmCalls).toHaveLength(0);
    expect(logger.success.mock.calls[0]![0]).toContain("Cloned");
  });

  test("expands shorthand and honors an explicit target dir", async () => {
    await runClone(["acme/service", "my-copy"]).result;
    expect(spawned()).toEqual([
      "git clone -- https://github.com/acme/service.git /base/my-copy",
    ]);
  });

  test("--depth and #ref map to git clone flags; --branch overrides the #ref", async () => {
    await runClone(["acme/service#v1"], { depth: 5 }).result;
    expect(spawned()[0]).toBe(
      "git clone --depth 5 --branch v1 -- https://github.com/acme/service.git /base/service",
    );

    resetMocks();
    await runClone(["acme/service#v1"], { branch: "v2" }).result;
    expect(spawned()[0]).toContain("--branch v2");
  });

  test("a failed clone reports git's stderr, removes the target, and exits 1", async () => {
    mockSpawnSync
      .mockImplementationOnce(
        () => ({ status: 0, stdout: "", stderr: "" }) as never,
      ) // preflight
      .mockImplementationOnce(
        () =>
          ({
            status: 128,
            stdout: "",
            stderr: "fatal: repo not found",
          }) as never,
      );
    const { result, logger } = runClone(["acme/missing"]);
    expect((await result).exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("fatal: repo not found"),
      ),
    ).toBe(true);
    expect(rmCalls.some((c) => c.path === "/base/missing")).toBe(true);
  });
});
