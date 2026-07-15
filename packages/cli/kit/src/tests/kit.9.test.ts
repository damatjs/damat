import { TMP, afterEach, beforeEach, describe, expect, fsState, it, join, resetKitTests, resolve, resolveKitSource, rmCalls, spawnSyncCalls } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("resolveKitSource", () => {
  it("clones a URL#ref shallow to a temp dir and cleanup removes it", () => {
    const resolved = resolveKitSource(
      "https://github.com/acme/kit.git#v2",
      "/proj",
    );
    expect(resolved.dir).toBe(TMP);
    expect(resolved.origin).toEqual({
      type: "git",
      ref: "https://github.com/acme/kit.git#v2",
      url: "https://github.com/acme/kit.git",
    });
    const clone = spawnSyncCalls.find((c) => c.args[0] === "clone");
    expect(clone!.cmd).toBe("git");
    expect(clone!.args).toEqual([
      "clone",
      "--depth",
      "1",
      "--branch",
      "v2",
      "--",
      "https://github.com/acme/kit.git",
      TMP,
    ]);
    expect(rmCalls).toHaveLength(0);
    resolved.cleanup();
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });

  it("refuses a subdirectory that escapes the checkout", () => {
    expect(() => resolveKitSource("acme/mono/../..", "/proj")).toThrow(
      'Subdirectory "../.." escapes the cloned repository',
    );
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });

  it("errors when the subdirectory does not exist in the clone", () => {
    expect(() => resolveKitSource("acme/mono/kits/auth", "/proj")).toThrow(
      'Path "kits/auth" not found inside https://github.com/acme/mono.git',
    );
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });

  it("resolves into an existing subdirectory of the clone", () => {
    const subDir = resolve(join(TMP, "kits/auth"));
    fsState.existsMap[subDir] = true;
    const resolved = resolveKitSource("acme/mono/kits/auth", "/proj");
    expect(resolved.dir).toBe(subDir);
    expect(resolved.origin).toEqual({
      type: "git",
      ref: "acme/mono/kits/auth",
      url: "https://github.com/acme/mono.git",
    });
    resolved.cleanup(); // removes the whole temp checkout, not just the subdir
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });
});
