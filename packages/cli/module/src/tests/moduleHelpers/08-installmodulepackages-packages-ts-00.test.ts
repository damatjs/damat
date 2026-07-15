import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { spawnSyncCalls, describe, it, expect } from "./context";

describe("installModulePackages (packages.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/packages"))
      .installModulePackages;

  it("returns ok with no spawn when there are no packages", async () => {
    const fn = await get();
    const res = fn("/app", {});
    expect(res).toEqual({ ok: true, output: "" });
    expect(spawnSyncCalls).toHaveLength(0);
  });
});
