import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  spawnSyncCalls,
  rmCalls,
  mockExistsSync,
  describe,
  it,
  expect,
} from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("clones a git url and returns a cleanup that removes the temp dir", async () => {
    // Local-path probe misses; after the clone the temp dir (the moduleDir, no
    // subdir) exists. Recognize the temp dir by its "damat-module-" prefix.
    mockExistsSync.mockImplementation((p: string) =>
      String(p).includes("damat-module-"),
    );
    fsState.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
    const fn = await get();
    const res = await fn("https://github.com/acme/mod.git#main", "/cwd");
    const cloneCall = spawnSyncCalls.find((c) => c.args.includes("clone"))!;
    expect(cloneCall.cmd).toBe("git");
    expect(cloneCall.args).toContain("--branch");
    expect(cloneCall.args).toContain("main");
    expect(res.origin.type).toBe("git");
    res.cleanup();
    expect(rmCalls.some((c) => String(c.path).includes("damat-module-"))).toBe(
      true,
    );
  });
});
