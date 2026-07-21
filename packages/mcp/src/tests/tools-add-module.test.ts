import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  addModule,
  lastArgs,
  resetCliMock,
  restoreCliEnvironment,
  setSpawnResult,
  spawnCalls,
} from "./tool-cli-fixture";

beforeEach(resetCliMock);
afterEach(restoreCliEnvironment);

describe("add_module", () => {
  test("rejects an absent or non-string source", async () => {
    expect(await addModule.handler({})).toMatchObject({ isError: true });
    expect(await addModule.handler({ source: 123 })).toMatchObject({
      isError: true,
    });
    expect(spawnCalls).toHaveLength(0);
  });

  test("builds the minimal command", async () => {
    await addModule.handler({ source: "user" });
    expect(lastArgs()).toEqual(["module", "add", "user"]);
  });

  test("forwards every current transactional installer option", async () => {
    await addModule.handler({
      source: "./inventory",
      mode: "package",
      packageBackend: "damat",
      target: ["module=src/modules/inventory", "jobs=src/jobs/inventory"],
      dryRun: true,
      yes: true,
      allowUnverified: true,
      allowScripts: true,
      experimentalPackage: true,
    });
    expect(lastArgs()).toEqual([
      "module",
      "add",
      "./inventory",
      "--mode",
      "package",
      "--package-backend",
      "damat",
      "--target",
      "module=src/modules/inventory",
      "--target",
      "jobs=src/jobs/inventory",
      "--dry-run",
      "--yes",
      "--allow-unverified",
      "--allow-scripts",
      "--experimental-package",
    ]);
  });

  test("advertises deliberate security and package opt-ins", () => {
    const props = (addModule.inputSchema as any).properties;
    expect(props).toHaveProperty("allowUnverified");
    expect(props).toHaveProperty("allowScripts");
    expect(props).toHaveProperty("experimentalPackage");
  });

  for (const [name, spawn, expected] of [
    [
      "returns output",
      { status: 0, stdout: "Installed", stderr: "" },
      [false, "Installed"],
    ],
    [
      "defaults success",
      { status: 0, stdout: "", stderr: "" },
      [false, "Done."],
    ],
    [
      "surfaces failure",
      { status: 1, stdout: "", stderr: "boom" },
      [true, "boom"],
    ],
    [
      "defaults failure",
      { status: 1, stdout: "", stderr: "" },
      [true, "Install failed."],
    ],
  ] as const) {
    test(name, async () => {
      setSpawnResult(spawn);
      expect(await addModule.handler({ source: "user" })).toEqual({
        isError: expected[0],
        text: expected[1],
      });
    });
  }
});
