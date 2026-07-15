import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { acquireArtifact } from "../../index";
import { recordingRunner, success } from "../fixtures/runtime";

describe("Git acquisition", () => {
  test("clones a ref and selects a safe subdirectory", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "installer-git-test-"));
    const calls: Array<{ command: string; args: string[]; cwd: string }> = [];
    const run = recordingRunner(calls, async (spec) => {
      if (spec.args[0] === "clone")
        mkdirSync(join(spec.args.at(-1)!, "packages", "blade"), {
          recursive: true,
        });
      return success;
    });
    const artifact = await acquireArtifact(
      {
        type: "git",
        url: "https://example.com/repo.git",
        ref: "v1",
        subdir: "packages/blade",
      },
      { run, tempRoot },
    );
    expect(calls.map(({ command, args }) => [command, ...args])).toEqual([
      [
        "git",
        "clone",
        "--quiet",
        "--no-checkout",
        "https://example.com/repo.git",
        expect.any(String),
      ],
      [
        "git",
        "-C",
        expect.any(String),
        "checkout",
        "--quiet",
        "--detach",
        "v1",
      ],
    ]);
    const checkout = artifact.rootDir.split("/packages/blade")[0]!;
    expect(basename(artifact.rootDir)).toBe("blade");
    artifact.cleanup();
    artifact.cleanup();
    expect(existsSync(checkout)).toBeFalse();
  });

  test("cleans a failed checkout and reports missing Git", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "installer-git-fail-"));
    const run = async () => ({
      ...success,
      exitCode: 127,
      stderr: "git: missing",
    });
    await expect(
      acquireArtifact({ type: "git", url: "repo" }, { run, tempRoot }),
    ).rejects.toThrow("git: missing");
    expect(readdirSync(tempRoot)).toEqual([]);
  });

  test("rejects traversal before invoking Git", async () => {
    let called = false;
    const run = async () => ((called = true), success);
    await expect(
      acquireArtifact(
        { type: "git", url: "repo", subdir: "../escape" },
        { run },
      ),
    ).rejects.toThrow("subdir");
    expect(called).toBeFalse();
  });
});
