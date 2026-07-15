import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect } from "./context";

describe("invalidPackageSpecs (packages.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/packages"))
      .invalidPackageSpecs;

  it("permits protocol ranges — but never whitespace — with allowUnsafeRanges", async () => {
    const fn = await get();
    expect(
      fn(
        { pkg: "git+https://github.com/a/b.git", other: "file:../local" },
        { allowUnsafeRanges: true },
      ),
    ).toEqual([]);
    expect(
      fn({ pkg: "1.0.0; rm -rf /" }, { allowUnsafeRanges: true }),
    ).toHaveLength(1);
  });
});
