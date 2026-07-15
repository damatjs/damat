import { TMP, afterEach, beforeEach, describe, expect, fsState, it, mockSpawnSync, resetKitTests, resolveKitSource, rmCalls, spawnSyncCalls } from "./context";

beforeEach(resetKitTests);
afterEach(resetKitTests);

describe("resolveKitSource", () => {
  it("uses an existing local path as-is with a no-op cleanup", () => {
    fsState.existsMap["/proj/kits/auth"] = true;
    const resolved = resolveKitSource("kits/auth", "/proj");
    expect(resolved.dir).toBe("/proj/kits/auth");
    expect(resolved.origin).toEqual({
      type: "path",
      ref: "kits/auth",
      url: "/proj/kits/auth",
    });
    resolved.cleanup(); // no-op — nothing to remove
    expect(rmCalls).toHaveLength(0);
    expect(spawnSyncCalls).toHaveLength(0); // never touched git
  });

  it("throws on a source that is neither a path nor a git source", () => {
    expect(() => resolveKitSource("???bad???", "/proj")).toThrow(
      /neither a git URL nor a github shorthand/,
    );
  });

  it("gives a clear error when git is missing", () => {
    fsState.spawnSyncResult = { status: 1, stdout: "", stderr: "" }; // git --version fails
    expect(() => resolveKitSource("acme/kit", "/proj")).toThrow(
      /git is required to add kits from git sources \(https:\/\/github\.com\/acme\/kit\.git\)/,
    );
  });

  it("cleans the temp dir and throws when the clone fails", () => {
    mockSpawnSync.mockImplementation(
      (cmd: string, args: string[], opts?: unknown) => {
        spawnSyncCalls.push({ cmd, args, opts });
        if (args[0] === "--version")
          return { status: 0, stdout: "git version 2", stderr: "" };
        return {
          status: 128,
          stdout: "",
          stderr: "fatal: repository not found",
        };
      },
    );
    expect(() => resolveKitSource("acme/kit", "/proj")).toThrow(
      "git clone failed for https://github.com/acme/kit.git: fatal: repository not found",
    );
    expect(rmCalls.some((c) => c.path === TMP)).toBe(true);
  });

});
