import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect } from "./context";

describe("invalidPackageSpecs (packages.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/packages"))
      .invalidPackageSpecs;

  it("rejects invalid npm names (flags, spaces, uppercase, traversal)", async () => {
    const fn = await get();
    for (const name of ["--registry=http://x", "a b", "Evil", "../up", ""]) {
      expect(fn({ [name]: "1.0.0" })).toHaveLength(1);
    }
  });
});
