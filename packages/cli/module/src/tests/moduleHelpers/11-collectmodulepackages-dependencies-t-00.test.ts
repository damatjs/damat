import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("collectModulePackages (dependencies.ts duplicate)", () => {
  it("covers the sibling implementation directly", async () => {
    fsState.existsMap = { "/pkg/package.json": true };
    fsState.readFileMap = {
      "/pkg/package.json": JSON.stringify({
        dependencies: { axios: "^1.0.0", "@damatjs/framework": "latest" },
      }),
    };
    const fn = (await import("../../commands/module/helpers/dependencies"))
      .collectModulePackages;
    const out = fn("/pkg", { packages: { ms: "^2.0.0" } } as never);
    expect(out).toEqual({ axios: "^1.0.0", ms: "^2.0.0" });
  });
});
