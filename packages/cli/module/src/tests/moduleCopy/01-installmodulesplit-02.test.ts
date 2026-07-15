import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, cpCalls, describe, it, expect, maps } from "./context";

describe("installModuleSplit", () => {
  const src = "/pkg/src";
  const cwd = "/app";

  it("merges api routes, workflows and tests subtrees into grouped targets", async () => {
    fsState.existsMap = {
      [`${src}/api/routes`]: true,
      [`${src}/workflows`]: true,
      [`${src}/links`]: false,
      [`/pkg/tests`]: true,
    };
    // mergeChildren reads each subtree's children.
    maps.readdir = {
      [`${src}/api/routes`]: ["users", "posts"],
      [`${src}/workflows`]: ["users"],
      [`/pkg/tests`]: ["contract.test.ts"],
    };
    const { installModuleSplit } =
      await import("../../commands/module/helpers/copy");
    const layout = installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
      packageDir: "/pkg",
    });
    expect(layout.apiTarget).toBe("/app/src/api/routes/user");
    expect(layout.workflowsTarget).toBe("/app/src/workflows/user");
    expect(layout.testsTarget).toBe("/app/tests/user");
    // Each child of api/routes was copied into the grouped target.
    expect(
      cpCalls.some((c) => c.dest === "/app/src/api/routes/user/users"),
    ).toBe(true);
    expect(
      cpCalls.some((c) => c.dest === "/app/src/api/routes/user/posts"),
    ).toBe(true);
    expect(
      cpCalls.some((c) => c.dest === "/app/src/workflows/user/users"),
    ).toBe(true);
    expect(
      cpCalls.some((c) => c.dest === "/app/tests/user/contract.test.ts"),
    ).toBe(true);
  });
});
