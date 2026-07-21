import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("removeModuleEnvVars", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/env")).removeModuleEnvVars;

  it("returns [] when .env.example is missing", async () => {
    fsState.existsDefault = false;
    const fn = await get();
    expect(fn("/app", "user")).toEqual([]);
    expect(writeCalls).toHaveLength(0);
  });
});
