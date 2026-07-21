import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("removeModuleEnvVars", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/env")).removeModuleEnvVars;

  it("returns [] when the module header is not present", async () => {
    fsState.existsMap = { "/app/.env.example": true };
    fsState.readFileMap = { "/app/.env.example": "BASE=1\n" };
    const fn = await get();
    expect(fn("/app", "user")).toEqual([]);
    expect(writeCalls).toHaveLength(0);
  });
});
