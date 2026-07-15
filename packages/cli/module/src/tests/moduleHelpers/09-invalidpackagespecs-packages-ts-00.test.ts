import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect } from "./context";

describe("invalidPackageSpecs (packages.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/packages"))
      .invalidPackageSpecs;

  it("accepts sane names with semver ranges and dist-tags", async () => {
    const fn = await get();
    expect(
      fn({
        stripe: "^14.0.0",
        "@scope/pkg": ">=1.2.3-beta.1",
        lodash: "*",
        next: "latest",
        bare: "",
      }),
    ).toEqual([]);
  });
});
