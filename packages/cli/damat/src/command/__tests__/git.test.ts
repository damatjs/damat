// setup.ts installs the process-global node:child_process mock and MUST be
// imported before the source under test (see its header comment).
import { state, mockSpawnSync, resetMocks } from "./setup";
import { describe, test, expect, beforeEach } from "bun:test";
import { gitAvailable, requireGit } from "../shared/git";

beforeEach(() => {
  resetMocks();
});

describe("gitAvailable", () => {
  test("true when `git --version` exits 0", () => {
    expect(gitAvailable()).toBe(true);
  });

  test("false when git exits non-zero", () => {
    state.spawnSyncResult = { status: 1, stdout: "", stderr: "" };
    expect(gitAvailable()).toBe(false);
  });

  test("false when spawn reports an error (git not on PATH)", () => {
    mockSpawnSync.mockImplementationOnce(
      () =>
        ({
          status: null,
          error: new Error("ENOENT"),
          stdout: "",
          stderr: "",
        }) as never,
    );
    expect(gitAvailable()).toBe(false);
  });

  test("false when spawn itself throws", () => {
    mockSpawnSync.mockImplementationOnce(() => {
      throw new Error("spawn exploded");
    });
    expect(gitAvailable()).toBe(false);
  });
});

describe("requireGit", () => {
  test("null when git is available", () => {
    expect(requireGit("clone repositories")).toBeNull();
  });

  test("a clear, non-evasive message when git is missing", () => {
    state.spawnSyncResult = { status: 1, stdout: "", stderr: "" };
    const message = requireGit("clone repositories");
    expect(message).toContain("git is required to clone repositories");
    expect(message).toContain("install git and re-run");
    expect(message).toContain("never installs its own");
  });
});
