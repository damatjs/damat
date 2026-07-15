import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, maps } from "./context";

describe("installModuleSplit", () => {
  const src = "/pkg/src";
  const cwd = "/app";

  it("defaults packageDir to sourceModuleDir for the legacy layout", async () => {
    fsState.existsMap = {
      [`${src}/api/routes`]: false,
      [`${src}/workflows`]: false,
      [`${src}/links`]: false,
      [`${src}/tests`]: true, // legacy: tests sit inside the module dir
    };
    maps.readdir = { [`${src}/tests`]: ["contract.test.ts"] };
    const { installModuleSplit } =
      await import("../../commands/module/helpers/copy");
    const layout = installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
    });
    expect(layout.testsTarget).toBe("/app/tests/user");
  });
});
