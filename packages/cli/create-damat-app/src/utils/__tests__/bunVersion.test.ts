import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { getBunVersion, MIN_SUPPORTED_BUN_VERSION } from "../gets/bunVersion";

describe("getBunVersion", () => {
  it("should return the major version of the running Bun as a number", () => {
    const expectedMajor = parseInt(Bun.version.split(".")[0]!, 10);
    expect(getBunVersion()).toBe(expectedMajor);
  });

  it("should return a positive integer", () => {
    const version = getBunVersion();
    expect(typeof version).toBe("number");
    expect(Number.isInteger(version)).toBe(true);
    expect(version).toBeGreaterThan(0);
  });

  it("should not include the minor or patch components", () => {
    // e.g. "1.3.11" -> 1, never 1.3 or 1.311
    expect(getBunVersion()).toBeLessThan(1000);
    expect(getBunVersion() % 1).toBe(0);
  });
});

describe("getBunVersion (invalid version format)", () => {
  let parseIntSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    parseIntSpy?.mockRestore();
  });

  it("should throw when the parsed major is NaN", () => {
    // Bun.version is a non-configurable, readonly global, so we cannot stub it.
    // Instead drive the defensive NaN guard by forcing parseInt to return NaN,
    // exercising the `isNaN(major)` throw branch.
    parseIntSpy = spyOn(globalThis, "parseInt").mockReturnValue(NaN);
    expect(() => getBunVersion()).toThrow("Invalid Bun version format");
  });
});

describe("MIN_SUPPORTED_BUN_VERSION", () => {
  it("should be 1", () => {
    expect(MIN_SUPPORTED_BUN_VERSION).toBe(1);
  });

  it("should be satisfied by the current Bun runtime", () => {
    expect(getBunVersion()).toBeGreaterThanOrEqual(MIN_SUPPORTED_BUN_VERSION);
  });
});
