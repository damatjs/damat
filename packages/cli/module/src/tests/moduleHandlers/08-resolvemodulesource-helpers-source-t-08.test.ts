import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, spawnSyncCalls, describe, it, expect } from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("errors clearly when git itself is missing — no clone attempted", async () => {
    fsState.existsDefault = false;
    fsState.spawnSyncResult = { status: 1, stdout: "", stderr: "" }; // `git --version` fails
    const fn = await get();
    await expect(fn("https://github.com/acme/mod.git", "/cwd")).rejects.toThrow(
      /git is required to install modules from git sources/,
    );
    expect(spawnSyncCalls.some((c) => c.args.includes("clone"))).toBe(false);
  });
});
