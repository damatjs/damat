import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  lastArgs,
  resetCliMock,
  restoreCliEnvironment,
  setSpawnResult,
  spawnCalls,
  updateModule,
} from "./tool-cli-fixture";

beforeEach(resetCliMock);
afterEach(restoreCliEnvironment);

describe("update_module", () => {
  test("rejects an absent or non-string id", async () => {
    expect(await updateModule.handler({})).toMatchObject({ isError: true });
    expect(await updateModule.handler({ id: 42 })).toMatchObject({
      isError: true,
    });
    expect(spawnCalls).toHaveLength(0);
  });

  test("builds minimal and configured commands", async () => {
    await updateModule.handler({ id: "user" });
    expect(lastArgs()).toEqual(["module", "update", "user"]);
    await updateModule.handler({
      id: "user",
      target: ["jobs=src/jobs/user"],
      yes: true,
      allowUnverified: true,
      allowScripts: true,
      dryRun: true,
    });
    expect(lastArgs()).toEqual([
      "module",
      "update",
      "user",
      "--target",
      "jobs=src/jobs/user",
      "--dry-run",
      "--yes",
      "--allow-unverified",
      "--allow-scripts",
    ]);
  });

  for (const [name, spawn, expected] of [
    [
      "returns output",
      { status: 0, stdout: "Updated", stderr: "" },
      [false, "Updated"],
    ],
    [
      "defaults success",
      { status: 0, stdout: "", stderr: "" },
      [false, "Done."],
    ],
    [
      "surfaces failure",
      { status: 1, stdout: "", stderr: "blocked" },
      [true, "blocked"],
    ],
    [
      "defaults failure",
      { status: 1, stdout: "", stderr: "" },
      [true, "Update failed."],
    ],
  ] as const) {
    test(name, async () => {
      setSpawnResult(spawn);
      expect(await updateModule.handler({ id: "user" })).toEqual({
        isError: expected[0],
        text: expected[1],
      });
    });
  }
});
