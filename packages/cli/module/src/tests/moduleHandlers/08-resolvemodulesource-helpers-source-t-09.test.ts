import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, rmCalls, describe, it, expect } from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("throws and cleans up when the subdir is missing inside the repo", async () => {
    fsState.existsDefault = false; // temp dir / subdir do NOT exist after clone
    fsState.spawnSyncResult = { status: 0, stdout: "", stderr: "" };
    const fn = await get();
    await expect(fn("acme/mod/missing/dir", "/cwd")).rejects.toThrow(
      /not found inside/,
    );
    expect(rmCalls.some((c) => String(c.path).includes("damat-module-"))).toBe(
      true,
    );
  });
});
