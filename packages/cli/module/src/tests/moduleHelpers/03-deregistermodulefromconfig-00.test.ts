import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("deregisterModuleFromConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .deregisterModuleFromConfig;

  it("returns false when the config file is missing", async () => {
    fsState.existsDefault = false;
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user")).toBe(false);
  });
});
