import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, mm } from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("throws for input that is neither a path nor a recognizable git source", async () => {
    fsState.existsDefault = false;
    mm.parseRef = null; // not a registry ref either
    const fn = await get();
    await expect(fn("???not a thing???", "/cwd")).rejects.toThrow(
      /neither an existing path nor a recognizable git source/,
    );
  });
});
