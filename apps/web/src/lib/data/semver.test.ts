import { describe, expect, test } from "bun:test";
import { compareSemver, compareSemverDesc, isSemver } from "./semver";

describe("release semver", () => {
  test("accepts stable and prerelease versions", () => {
    expect(isSemver("1.0.0")).toBe(true);
    expect(isSemver("1.0.0-beta.0")).toBe(true);
    expect(isSemver("next")).toBe(false);
  });

  test("orders prereleases according to SemVer", () => {
    expect(compareSemver("1.0.0-beta.0", "1.0.0-beta.1")).toBeLessThan(0);
    expect(compareSemver("1.0.0-beta.1", "1.0.0")).toBeLessThan(0);
    expect(compareSemver("2.0.0-beta.0", "1.9.9")).toBeGreaterThan(0);
  });

  test("sorts newest first", () => {
    const versions = ["1.0.0-beta.0", "0.6.0", "1.0.0"].sort(compareSemverDesc);
    expect(versions).toEqual(["1.0.0", "1.0.0-beta.0", "0.6.0"]);
  });
});
