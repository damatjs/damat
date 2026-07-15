import { state, writeCalls, mockMkdirSync, resetMocks } from "../setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { authInitCommand, authCommand } from "../../commands/auth";
import { createContext } from "../helpers";

const run = (args: string[], options: Record<string, unknown> = {}) => {
  const { ctx, logger } = createContext(
    { dir: "src/modules", force: false, ...options },
    { args, cwd: "/app" } as never,
  );
  return { result: authInitCommand.handler(ctx), logger };
};

const written = (suffix: string) =>
  writeCalls.find((c) => c.path.endsWith(suffix));
export const resetContext = resetMocks;
export {
  state,
  writeCalls,
  mockMkdirSync,
  resetMocks,
  describe,
  test,
  expect,
  beforeEach,
  authInitCommand,
  authCommand,
  createContext,
  run,
  written,
};
