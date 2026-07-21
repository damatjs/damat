import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, spawnSyncCalls, describe, it, expect } from "./context";

describe("installModulePackages (packages.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/packages"))
      .installModulePackages;

  it("runs `bun add --ignore-scripts` with versioned + bare specs by default", async () => {
    fsState.spawnSyncResult = { status: 0, stdout: "added", stderr: "" };
    const fn = await get();
    const res = fn("/app", { stripe: "^14.0.0", lodash: "*" });
    expect(res.ok).toBe(true);
    expect(spawnSyncCalls[0]!.cmd).toBe("bun");
    expect(spawnSyncCalls[0]!.args).toEqual([
      "add",
      "--ignore-scripts",
      "stripe@^14.0.0",
      "lodash",
    ]);
  });
});
