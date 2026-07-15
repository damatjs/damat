import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, mm } from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("throws for a bare registry name no registry knows", async () => {
    fsState.existsDefault = false;
    mm.parseRef = { name: "ghost" };
    mm.registryRecord = null; // no record
    const fn = await get();
    await expect(fn("ghost", "/cwd")).rejects.toThrow(
      /registry module reference/,
    );
  });
});
