import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, rmCalls, describe, it, expect } from "./context";

describe("installModuleSplit", () => {
  const src = "/pkg/src";
  const cwd = "/app";

  it("force-wipes an existing module home before copying", async () => {
    fsState.existsMap = {
      "/app/src/modules/user": true, // exists → rm on force
      [`${src}/api/routes`]: false,
      [`${src}/workflows`]: false,
      [`${src}/links`]: false,
      [`/pkg/tests`]: false,
    };
    const { installModuleSplit } =
      await import("../../commands/module/helpers/copy");
    installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
      packageDir: "/pkg",
      force: true,
    });
    expect(rmCalls.some((c) => c.path === "/app/src/modules/user")).toBe(true);
  });
});
