import { mock } from "bun:test";
import type { CliLogger } from "@damatjs/cli";

export function createTestLogger(): CliLogger & {
  debug: ReturnType<typeof mock>;
  info: ReturnType<typeof mock>;
  error: ReturnType<typeof mock>;
} {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    success: mock(() => {}),
    skip: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
  };
}
