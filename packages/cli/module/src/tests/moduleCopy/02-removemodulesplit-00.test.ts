import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  rmCalls,
  writeCalls,
  describe,
  it,
  expect,
  maps,
} from "./context";

describe("removeModuleSplit", () => {
  const cwd = "/app";

  it("removes every existing layout target and regenerates the links aggregator", async () => {
    fsState.existsMap = {
      "/app/src/modules/user": true,
      "/app/src/api/routes/user": true,
      "/app/src/workflows/user": true,
      "/app/src/links/user": true,
      "/app/tests/user": true,
      "/app/src/links": true, // aggregator regenerated from remaining owners
      "/app/src/links/billing/index.ts": true,
    };
    // listOwnerDirs over the links root after removal: billing remains.
    maps.readdir = { "/app/src/links": ["billing"] };
    maps.statDir = { "/app/src/links/billing": true };
    const { removeModuleSplit } =
      await import("../../commands/module/helpers/copy");
    const result = removeModuleSplit(cwd, "user", "src/modules");
    expect(result.removed).toEqual([
      "/app/src/modules/user",
      "/app/src/api/routes/user",
      "/app/src/workflows/user",
      "/app/src/links/user",
      "/app/tests/user",
    ]);
    expect(result.linksRegenerated).toBe(true);
    // Each target was rm'd recursively.
    for (const target of result.removed) {
      expect(
        rmCalls.some(
          (c) =>
            c.path === target &&
            (c.opts as { recursive: boolean }).recursive === true,
        ),
      ).toBe(true);
    }
    // Aggregator rewritten from the surviving owner dirs.
    const aggregator = writeCalls.find(
      (w) => w.path === "/app/src/links/index.ts",
    );
    expect(aggregator).toBeDefined();
    expect(aggregator!.content).toContain("billingLinks");
    expect(aggregator!.content).not.toContain("userLinks");
  });
});
