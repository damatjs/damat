import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, cpCalls, describe, it, expect, maps } from "./context";

describe("installModuleSplit", () => {
  const src = "/pkg/src";
  const cwd = "/app";

  it("preserves an owner-edited link target (skip-existing) unless forced", async () => {
    fsState.existsMap = {
      [`${src}/api/routes`]: false,
      [`${src}/workflows`]: false,
      [`${src}/links`]: true,
      [`/pkg/tests`]: false,
      // The destination already exists and force is false → NOT overwritten.
      "/app/src/links/user/models/user-org.ts": true,
      "/app/src/links/user/models": true,
      "/app/src/links": true,
      "/app/src/links/user/index.ts": true,
    };
    maps.readdir = {
      [`${src}/links`]: ["user-org.ts"],
      "/app/src/links/user/models": ["user-org.ts"],
      "/app/src/links": ["user"],
    };
    maps.statDir = { "/app/src/links/user": true };
    const { installModuleSplit } =
      await import("../../commands/module/helpers/copy");
    installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
      packageDir: "/pkg",
    });
    // The existing model was preserved (no cpSync to that destination).
    expect(
      cpCalls.some((c) => c.dest === "/app/src/links/user/models/user-org.ts"),
    ).toBe(false);
  });
});
