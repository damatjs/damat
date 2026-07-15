import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveArtifact } from "../../index";
import { tar } from "../fixtures/archive";
import { success } from "../fixtures/runtime";

const sha = "0123456789abcdef0123456789abcdef01234567";

describe("resolveArtifact", () => {
  test("pins local trees to canonical integrity", async () => {
    const root = mkdtempSync(join(tmpdir(), "installer-final-local-"));
    writeFileSync(join(root, "index.ts"), "local");
    const artifact = await resolveArtifact(
      { type: "local", path: root },
      { run: async () => success },
    );
    expect(artifact.immutableIdentity).toBe(`local:${artifact.integrity}`);
    expect(artifact.supportedModes).toEqual(["source"]);
    expect(artifact.provenance.request).toEqual({ type: "local", path: root });
  });

  test("pins Git refs to a commit and package reference", async () => {
    const run = async (spec: { args: string[] }) => {
      if (spec.args[0] === "clone")
        mkdirSync(spec.args.at(-1)!, { recursive: true });
      return spec.args.includes("rev-parse")
        ? { ...success, stdout: `${sha}\n` }
        : success;
    };
    const artifact = await resolveArtifact(
      { type: "git", url: "https://example.com/repo.git", ref: "main" },
      { run },
    );
    expect(artifact.immutableIdentity).toBe(`git:${sha}`);
    expect(artifact.packageReference).toEndWith(`#${sha}`);
    expect(artifact.supportedModes).toEqual(["source", "package"]);
    artifact.cleanup();
  });

  test("keeps registry identity and rejects mismatched integrity with cleanup", async () => {
    const root = mkdtempSync(join(tmpdir(), "installer-final-reg-"));
    writeFileSync(join(root, "index.ts"), "registry");
    const resolveRegistry = async () => ({
      origin: { type: "local" as const, path: root },
      verification: "verified" as const,
    });
    const artifact = await resolveArtifact(
      { type: "registry", ref: "auth@stable" },
      { run: async () => success, resolveRegistry },
    );
    expect(artifact.immutableIdentity).toStartWith("registry:auth@stable:");
    const tempRoot = mkdtempSync(join(tmpdir(), "installer-final-bad-"));
    const bytes = tar([{ name: "index.ts", body: "bad" }]);
    const fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
      arrayBuffer: async () => bytes.buffer,
    });
    await expect(
      resolveArtifact(
        {
          type: "tarball",
          url: "https://example.com/a.tar",
          integrity: "sha256:wrong",
        },
        { run: async () => success, fetch, tempRoot },
      ),
    ).rejects.toThrow("integrity mismatch");
    expect(readdirSync(tempRoot)).toEqual([]);
  });
});
