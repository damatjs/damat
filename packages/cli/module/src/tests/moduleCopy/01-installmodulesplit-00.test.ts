import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, cpCalls, describe, it, expect, sep } from "./context";

describe("installModuleSplit", () => {
  const src = "/pkg/src";
  const cwd = "/app";

  it("copies just the module home when it ships no api/workflows/links/tests", async () => {
    // No subtrees present; collectLinkModelFiles sees no links dir.
    fsState.existsMap = {
      [`${src}/api/routes`]: false,
      [`${src}/workflows`]: false,
      [`${src}/links`]: false,
      [`/pkg/tests`]: false,
    };
    const { installModuleSplit } =
      await import("../../commands/module/helpers/copy");
    const layout = installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
      packageDir: "/pkg",
    });
    expect(layout.moduleHome).toBe("/app/src/modules/user");
    expect(layout.apiTarget).toBeNull();
    expect(layout.workflowsTarget).toBeNull();
    expect(layout.linksTarget).toBeNull();
    expect(layout.testsTarget).toBeNull();
    // The module-home copy ran with a filter that excludes the split subtrees.
    const home = cpCalls.find((c) => c.dest === "/app/src/modules/user");
    expect(home).toBeDefined();
    const filter = (home!.opts as { filter: (s: string) => boolean }).filter;
    expect(filter(`${src}/models/user.ts`)).toBe(true);
    expect(filter(`${src}/api`)).toBe(false);
    expect(filter(`${src}/api${sep}routes`)).toBe(false);
    expect(filter(`${src}/workflows`)).toBe(false);
    expect(filter(`${src}/links`)).toBe(false);
    expect(filter(`${src}/tests`)).toBe(false);
    expect(filter(`${src}/.git`)).toBe(false);
  });
});
