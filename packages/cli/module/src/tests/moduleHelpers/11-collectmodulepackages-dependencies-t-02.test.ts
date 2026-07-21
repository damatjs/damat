import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("collectModulePackages (dependencies.ts duplicate)", () => {
  it("returns empty when there is no package.json and no overrides", async () => {
    fsState.existsDefault = false;
    const fn = (await import("../../commands/module/helpers/dependencies"))
      .collectModulePackages;
    expect(fn("/pkg", {} as never)).toEqual({});
  });
});
