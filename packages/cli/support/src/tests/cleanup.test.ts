import { beforeEach, describe, expect, test } from "bun:test";
import { state, resetSupportMocks, unlinkCalls } from "./setup";
import { createTestLogger } from "./logger";
import { cleanupTempFile } from "../cleanupTempFile";

beforeEach(resetSupportMocks);

describe("cleanupTempFile", () => {
  test("removes an existing temporary file", () => {
    state.exists = true;
    cleanupTempFile("/app/temp.ts", createTestLogger());
    expect(unlinkCalls).toEqual(["/app/temp.ts"]);
  });

  test("does nothing when the file is absent", () => {
    cleanupTempFile("/app/temp.ts", createTestLogger());
    expect(unlinkCalls).toEqual([]);
  });

  test("reports cleanup failures at debug level", () => {
    state.exists = true;
    state.unlinkError = new Error("denied");
    const logger = createTestLogger();
    cleanupTempFile("/app/temp.ts", logger);
    expect(logger.debug).toHaveBeenCalledWith(
      "Failed to clean up /app/temp.ts: denied",
    );
  });
});
