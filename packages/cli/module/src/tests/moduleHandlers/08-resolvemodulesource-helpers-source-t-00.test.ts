import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("resolves an existing local path with a no-op cleanup", async () => {
    fsState.existsMap = { "/abs/mod": true };
    const fn = await get();
    const res = await fn("/abs/mod", "/cwd");
    expect(res.dir).toBe("/abs/mod");
    expect(res.origin).toMatchObject({ type: "path", ref: "/abs/mod" });
    res.cleanup(); // no-op, just exercise it
  });
});
