// setup.ts installs the process-global node:fs mock and MUST be imported
// before the source under test (see the header comment in setup.ts).
import { state, mockUnlinkSync, unlinkCalls } from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { cleanupTempFile } from "../shared/cleanupTempFile";
import { createMockLogger } from "./helpers";
import type { ILogger } from "@damatjs/logger";

beforeEach(() => {
  state.existsMap = {};
  state.existsDefault = false;
  unlinkCalls.length = 0;
  mockUnlinkSync.mockClear();
});

describe("cleanupTempFile", () => {
  test("removes an existing temp file", () => {
    state.existsMap["/app/.damat/dev-entry.ts"] = true;
    const logger = createMockLogger();

    cleanupTempFile("/app/.damat/dev-entry.ts", logger as unknown as ILogger);

    expect(unlinkCalls).toEqual(["/app/.damat/dev-entry.ts"]);
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test("is a no-op when the file does not exist", () => {
    const logger = createMockLogger();

    cleanupTempFile("/app/.damat/missing.ts", logger as unknown as ILogger);

    expect(unlinkCalls).toEqual([]);
    expect(logger.debug).not.toHaveBeenCalled();
  });

  test("logs at debug level (and does not throw) when removal fails", () => {
    state.existsMap["/app/.damat/dev-entry.ts"] = true;
    mockUnlinkSync.mockImplementationOnce(() => {
      throw new Error("EACCES: permission denied");
    });
    const logger = createMockLogger();

    expect(() =>
      cleanupTempFile("/app/.damat/dev-entry.ts", logger as unknown as ILogger),
    ).not.toThrow();

    expect(logger.debug).toHaveBeenCalledTimes(1);
    const [message] = logger.debug.mock.calls[0]!;
    expect(String(message)).toContain("Failed to clean up /app/.damat/dev-entry.ts");
    expect(String(message)).toContain("EACCES: permission denied");
  });
});
