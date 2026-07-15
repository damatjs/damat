import { beforeEach, describe, expect, test } from "bun:test";
import { mockSpawnSync, resetSupportMocks, state } from "./setup";
import { gitAvailable, requireGit } from "../git";

beforeEach(resetSupportMocks);

describe("gitAvailable", () => {
  test("detects a successful git binary", () => {
    expect(gitAvailable()).toBe(true);
  });

  test("rejects non-zero and process errors", () => {
    state.spawnSyncResult = { status: 1 };
    expect(gitAvailable()).toBe(false);
    state.spawnSyncResult = { status: null, error: new Error("missing") };
    expect(gitAvailable()).toBe(false);
  });

  test("rejects a thrown spawn", () => {
    mockSpawnSync.mockImplementationOnce(() => {
      throw new Error("failed");
    });
    expect(gitAvailable()).toBe(false);
  });
});

describe("requireGit", () => {
  test("returns null when git is available", () => {
    expect(requireGit("clone repositories")).toBeNull();
  });

  test("returns installation guidance when git is missing", () => {
    state.spawnSyncResult = { status: 1 };
    expect(requireGit("clone repositories")).toContain(
      "git is required to clone repositories",
    );
  });
});
