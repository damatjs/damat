import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  cpCalls,
  writeCalls,
  mockMkdirSync,
  describe,
  it,
  expect,
  maps,
} from "./context";

describe("installModuleSplit", () => {
  const src = "/pkg/src";
  const cwd = "/app";

  it("installs shipped link models and regenerates both barrels", async () => {
    fsState.existsMap = {
      [`${src}/api/routes`]: false,
      [`${src}/workflows`]: false,
      [`${src}/links`]: true,
      [`/pkg/tests`]: false,
      // collectLinkModelFiles walk: links dir holds models/ with two .ts.
      // installModuleLinks copies skip-existing — destinations absent so copied.
      "/app/src/links/user/models/user-org.ts": false,
      "/app/src/links/user/models/user-team.ts": false,
      // renderOwnerIndex → listModelBasenames(modelsTarget): dir exists.
      "/app/src/links/user/models": true,
      // renderAggregator → listOwnerDirs(linksRoot): dir exists, owner has index.
      "/app/src/links": true,
      "/app/src/links/user/index.ts": true,
    };
    // Walk of the shipped links source: links/ -> models/ (dir) -> two files.
    maps.readdir = {
      [`${src}/links`]: ["models"],
      [`${src}/links/models`]: ["user-org.ts", "user-team.ts", "index.ts"],
      // listModelBasenames over the installed models target.
      "/app/src/links/user/models": ["user-org.ts", "user-team.ts", "index.ts"],
      // listOwnerDirs over the links root.
      "/app/src/links": ["user"],
    };
    maps.statDir = {
      [`${src}/links/models`]: true, // a directory → walked
      "/app/src/links/user": true, // owner dir
    };
    const { installModuleSplit } =
      await import("../../commands/module/helpers/copy");
    const layout = installModuleSplit(src, {
      cwd,
      moduleId: "user",
      modulesDir: "src/modules",
      packageDir: "/pkg",
    });
    expect(layout.linksTarget).toBe("/app/src/links/user");
    // models/ + migrations/ dirs ensured.
    expect(
      mockMkdirSync.mock.calls.some(
        (c) => c[0] === "/app/src/links/user/models",
      ),
    ).toBe(true);
    expect(
      mockMkdirSync.mock.calls.some(
        (c) => c[0] === "/app/src/links/user/migrations",
      ),
    ).toBe(true);
    // The two shipped models were copied.
    expect(
      cpCalls.some((c) => c.dest === "/app/src/links/user/models/user-org.ts"),
    ).toBe(true);
    // Owner index + top-level aggregator regenerated.
    expect(
      writeCalls.some((w) => w.path === "/app/src/links/user/index.ts"),
    ).toBe(true);
    expect(writeCalls.some((w) => w.path === "/app/src/links/index.ts")).toBe(
      true,
    );
  });
});
