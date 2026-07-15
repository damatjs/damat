import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect } from "./context";

describe("installModuleSplit", () => {

  it("exposes the same layout via moduleLayoutPaths (install/remove single source of truth)", async () => {
    const { moduleLayoutPaths } =
      await import("../../commands/module/helpers/copy");
    expect(moduleLayoutPaths("/app", "user", "src/modules")).toEqual({
      moduleHome: "/app/src/modules/user",
      apiTarget: "/app/src/api/routes/user",
      workflowsTarget: "/app/src/workflows/user",
      linksRoot: "/app/src/links",
      linksTarget: "/app/src/links/user",
      testsTarget: "/app/tests/user",
    });
  });
});
