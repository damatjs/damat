import { describe, it, expect } from "bun:test";
import { executeQuery, acquireClient, releaseClient } from "..";

describe("query utilities", () => {
  it("should export executeQuery function", () => {
    expect(executeQuery).toBeFunction();
  });

  it("should export acquireClient function", () => {
    expect(acquireClient).toBeFunction();
  });

  it("should export releaseClient function", () => {
    expect(releaseClient).toBeFunction();
  });
});
