import { mock } from "bun:test";
import type { CommandContext } from "@damatjs/cli";

/**
 * A logger test double that records every call. Mirrors the subset of the
 * @damatjs/logger ILogger surface that the damat commands actually use.
 */
export function createMockLogger() {
  return {
    info: mock((..._args: unknown[]) => {}),
    success: mock((..._args: unknown[]) => {}),
    error: mock((..._args: unknown[]) => {}),
    warn: mock((..._args: unknown[]) => {}),
    debug: mock((..._args: unknown[]) => {}),
  };
}

export type MockLogger = ReturnType<typeof createMockLogger>;

/**
 * Build a CommandContext for invoking a command handler directly in tests.
 */
export function createContext(
  options: Record<string, unknown>,
  overrides: Partial<CommandContext> = {},
): { ctx: CommandContext; logger: MockLogger } {
  const logger = createMockLogger();
  const ctx = {
    command: "test",
    args: [],
    options,
    cwd: "/project",
    logger: logger as unknown as CommandContext["logger"],
    ...overrides,
  } as CommandContext;
  return { ctx, logger };
}

/**
 * A fake Bun.spawn subprocess: only `.exited` is consumed by the commands.
 */
export function fakeSpawnResult(exitCode = 0) {
  return { exited: Promise.resolve(exitCode) };
}
