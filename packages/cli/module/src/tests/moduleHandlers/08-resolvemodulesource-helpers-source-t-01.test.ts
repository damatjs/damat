import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("resolves a relative local path against cwd", async () => {
    fsState.existsMap = { "/cwd/mod": true };
    const fn = await get();
    const res = await fn("./mod", "/cwd");
    expect(res.dir).toBe("/cwd/mod");
    expect(res.origin.type).toBe("path");
  });
});
