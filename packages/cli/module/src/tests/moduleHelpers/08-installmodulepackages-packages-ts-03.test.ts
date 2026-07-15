import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("installModulePackages (packages.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/packages"))
      .installModulePackages;

  it("reports failure (and combined output) on a non-zero status", async () => {
    fsState.spawnSyncResult = { status: 1, stdout: "out", stderr: "err" };
    const fn = await get();
    const res = fn("/app", { stripe: "^14.0.0" });
    expect(res.ok).toBe(false);
    expect(res.output).toBe("outerr");
  });
});
