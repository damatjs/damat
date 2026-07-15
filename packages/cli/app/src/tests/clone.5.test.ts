// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { state, rmCalls, cpCalls, spawnSyncCalls, resetMocks } from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { join, resolve } from "node:path";
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
const TEMP = `${join(tmpdir(), "damat-clone-")}XXXXXX`;

describe("damat clone — subdirectory extraction", () => {
  test("shallow-clones to a temp dir, copies the subdir out, and cleans up", async () => {
    state.existsMap[resolve(join(TEMP, "examples/api"))] = true;
    const { result, logger } = runClone(["acme/mono/examples/api", "my-api"]);
    expect((await result).exitCode).toBe(0);

    expect(spawned()).toEqual([
      `git clone --depth 1 -- https://github.com/acme/mono.git ${TEMP}`,
    ]);
    expect(cpCalls[0]).toMatchObject({
      src: resolve(join(TEMP, "examples/api")),
      dest: "/base/my-api",
    });
    // The copy filter drops VCS and dependency dirs but keeps source files.
    const { filter } = cpCalls[0]!.opts as { filter: (src: string) => boolean };
    expect(filter(join(TEMP, "examples/api", "src", "x.ts"))).toBe(true);
    expect(filter(join(TEMP, "examples/api", ".git"))).toBe(false);
    expect(filter(join(TEMP, "examples/api", ".git", "HEAD"))).toBe(false);
    expect(filter(join(TEMP, "examples/api", "node_modules"))).toBe(false);
    expect(
      filter(join(TEMP, "examples/api", "node_modules", "x", "i.js")),
    ).toBe(false);
    expect(rmCalls.some((c) => c.path === TEMP)).toBe(true);
    // Extraction can't carry history — the hint appears without --fresh.
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes("no git history"),
      ),
    ).toBe(true);
  });

  test("refuses a subpath that escapes the checkout", async () => {
    const { result, logger } = runClone(["acme/mono/../../../etc"]);
    expect((await result).exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("escapes the cloned repository"),
      ),
    ).toBe(true);
    expect(cpCalls).toHaveLength(0);
  });

  test("errors when the subdir does not exist in the repo", async () => {
    const { result, logger } = runClone(["acme/mono/nope/nothing"]);
    expect((await result).exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("not found inside"),
      ),
    ).toBe(true);
  });
});
