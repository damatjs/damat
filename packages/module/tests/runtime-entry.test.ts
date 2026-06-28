import { describe, expect, test, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runModuleEntry } from "../src";

/**
 * runModuleEntry wraps startModuleApp with a try/catch that logs and exits(1) on
 * failure. We exercise the failure path without a database by running it in a
 * directory that has no module.json — startModuleApp throws during
 * locateModuleDir, well before any DB connection is attempted. process.exit and
 * console.error are stubbed so the test observes the behaviour instead of
 * killing the runner.
 *
 * The success path requires a live Postgres + full framework runtime and is
 * covered by the skipIf(!DATABASE_URL) integration test in
 * harness-integration.test.ts.
 */
describe("runModuleEntry", () => {
  const realExit = process.exit;
  const realError = console.error;
  const realCwd = process.cwd();

  afterEach(() => {
    process.exit = realExit;
    console.error = realError;
    process.chdir(realCwd);
  });

  test("logs and exits(1) when the module app fails to start", async () => {
    const dir = mkdtempSync(join(tmpdir(), "damat-entry-nomodule-"));
    let exitCode: number | undefined;
    const errors: unknown[][] = [];
    process.exit = ((code?: number) => {
      exitCode = code;
      return undefined as never;
    }) as typeof process.exit;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    process.chdir(dir);
    try {
      await runModuleEntry();
      expect(exitCode).toBe(1);
      expect(errors.length).toBeGreaterThan(0);
      expect(String(errors[0]?.[0])).toContain("Failed to start module:");
    } finally {
      process.chdir(realCwd);
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
