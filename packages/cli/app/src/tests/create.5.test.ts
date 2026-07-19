// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { writeCalls, mockSpawnSync, resetMocks } from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { createCommand } from "../commands/create";
import { createContext } from "./helpers";

beforeEach(() => {
  resetMocks();
});

const runCreate = (args: string[], options: Record<string, unknown> = {}) => {
  const { ctx, logger } = createContext(
    { git: true, install: true, databaseSetup: false, ...options },
    { args, cwd: "/base" } as never,
  );
  return { result: createCommand.handler(ctx), logger };
};

const _written = (suffix: string) =>
  writeCalls.find((c) => c.path.endsWith(suffix));

describe("damat create — git/install flags and failures", () => {
  test("a throwing bun install spawn is treated as failure, not a crash", async () => {
    mockSpawnSync.mockImplementationOnce(() => {
      throw new Error("ENOENT: bun not found");
    });
    const { result, logger } = runCreate(["my-api"], { git: false });
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("bun install failed"),
      ),
    ).toBe(true);
  });

  test("skipping install adds `bun install` to the next steps", async () => {
    const { result, logger } = runCreate(["my-api"], {
      git: false,
      install: false,
    });
    expect((await result).exitCode).toBe(0);
    const info = logger.info.mock.calls.map((c) => String(c[0])).join("\n");
    expect(info).toContain("bun install");
    expect(info).toContain("bunx @damatjs/damat-cli@latest module add");
  });
});
