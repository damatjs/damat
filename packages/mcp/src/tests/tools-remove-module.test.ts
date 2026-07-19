import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  lastArgs,
  removeModule,
  resetCliMock,
  restoreCliEnvironment,
  setSpawnResult,
  spawnCalls,
} from "./tool-cli-fixture";

beforeEach(resetCliMock);
afterEach(restoreCliEnvironment);

describe("remove_module", () => {
  test("rejects an absent or non-string id", async () => {
    expect(await removeModule.handler({})).toMatchObject({ isError: true });
    expect(await removeModule.handler({ id: 42 })).toMatchObject({
      isError: true,
    });
    expect(spawnCalls).toHaveLength(0);
  });

  test("builds minimal and confirmed dry-run commands", async () => {
    await removeModule.handler({ id: "user" });
    expect(lastArgs()).toEqual(["module", "remove", "user"]);
    await removeModule.handler({ id: "user", yes: true, dryRun: true });
    expect(lastArgs()).toEqual([
      "module",
      "remove",
      "user",
      "--yes",
      "--dry-run",
    ]);
  });

  for (const [name, spawn, expected] of [
    [
      "returns output",
      { status: 0, stdout: "Removed", stderr: "" },
      [false, "Removed"],
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
      [true, "Remove failed."],
    ],
  ] as const) {
    test(name, async () => {
      setSpawnResult(spawn);
      expect(await removeModule.handler({ id: "user" })).toEqual({
        isError: expected[0],
        text: expected[1],
      });
    });
  }
});
