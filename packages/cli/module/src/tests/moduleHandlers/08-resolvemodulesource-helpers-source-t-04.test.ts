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
  mm,
} from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("falls through to git when a slashed registry ref is unknown", async () => {
    // parseModuleRef matches but no record; because the source contains "/", it
    // is NOT treated as a definitive bare registry name — it falls through to
    // the github-shorthand path and clones.
    mm.parseRef = { name: "acme/mod" };
    mm.registryRecord = null;
    mockExistsSync.mockImplementation((p: string) =>
      String(p).includes("damat-module-"),
    );
    fsState.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
    const fn = await get();
    const res = await fn("acme/mod", "/cwd");
    expect(res.origin.type).toBe("git");
    const cloneCall = spawnSyncCalls.find((c) => c.args.includes("clone"))!;
    expect(cloneCall.args).toContain("https://github.com/acme/mod.git");
  });
});
