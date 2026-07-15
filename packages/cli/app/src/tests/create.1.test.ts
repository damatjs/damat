// setup.ts installs the process-global node:fs + node:child_process mocks and
// MUST be imported before the source under test (see its header comment).
import { state, writeCalls, resetMocks } from "./setup";
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

describe("damat create — validation", () => {
  test("rejects a missing name without writing anything", async () => {
    const { result, logger } = runCreate([]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(writeCalls).toHaveLength(0);
  });

  test("rejects a non-kebab-case name", async () => {
    const { result } = runCreate(["My_App"]);
    expect((await result).exitCode).toBe(1);
    expect(writeCalls).toHaveLength(0);
  });

  test("refuses when the target directory already exists", async () => {
    state.existsMap["/base/my-api"] = true;
    const { result, logger } = runCreate(["my-api"]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error.mock.calls[0]![0]).toContain("already exists");
    expect(writeCalls).toHaveLength(0);
  });
});
