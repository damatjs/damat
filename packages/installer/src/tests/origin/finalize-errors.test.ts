import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveArtifact } from "../../index";
import { success } from "../fixtures/runtime";

test("cleans up when Git finalization rejects the resolved commit", async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "installer-final-error-"));
  const run = async (spec: { args: string[] }) => {
    if (spec.args[0] === "clone")
      mkdirSync(spec.args.at(-1)!, { recursive: true });
    return spec.args.includes("rev-parse")
      ? { ...success, stdout: "not-a-commit\n" }
      : success;
  };

  await expect(
    resolveArtifact(
      { type: "git", url: "https://example.com/repo.git" },
      { run, tempRoot },
    ),
  ).rejects.toThrow("invalid commit identity");
  expect(readdirSync(tempRoot)).toEqual([]);
});
