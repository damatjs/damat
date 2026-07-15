import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("collectModulePackages (dependencies.ts duplicate)", () => {
  it("ignores an unreadable package.json (sibling)", async () => {
    fsState.existsMap = { "/pkg/package.json": true };
    fsState.readFileMap = { "/pkg/package.json": "broken" };
    const fn = (await import("../../commands/module/helpers/dependencies"))
      .collectModulePackages;
    expect(fn("/pkg", {} as never)).toEqual({});
  });
});
