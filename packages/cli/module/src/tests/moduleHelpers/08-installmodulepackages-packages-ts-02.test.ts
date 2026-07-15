import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, spawnSyncCalls, describe, it, expect } from "./context";

describe("installModulePackages (packages.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/packages"))
      .installModulePackages;

  it("drops --ignore-scripts only when allowScripts is set", async () => {
    fsState.spawnSyncResult = { status: 0, stdout: "added", stderr: "" };
    const fn = await get();
    fn("/app", { stripe: "^14.0.0" }, { allowScripts: true });
    expect(spawnSyncCalls[0]!.args).toEqual(["add", "stripe@^14.0.0"]);
  });
});
