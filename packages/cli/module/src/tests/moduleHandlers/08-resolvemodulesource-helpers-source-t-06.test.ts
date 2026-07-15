import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  spawnSyncCalls,
  mockExistsSync,
  describe,
  it,
  expect,
} from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("resolves a github shorthand with a subdirectory", async () => {
    // Local-path probe misses (no "damat-module-" in "/cwd/acme..."); after the
    // clone the temp dir + subdir exist.
    mockExistsSync.mockImplementation((p: string) =>
      String(p).includes("damat-module-"),
    );
    fsState.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
    const fn = await get();
    const res = await fn("acme/mod/packages/widget", "/cwd");
    expect(res.origin.type).toBe("git");
    const cloneCall = spawnSyncCalls.find((c) => c.args.includes("clone"))!;
    expect(cloneCall.args).toContain("https://github.com/acme/mod.git");
  });
});
