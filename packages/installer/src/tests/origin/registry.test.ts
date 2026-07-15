import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireArtifact } from "../../index";
import { success } from "../fixtures/runtime";

const run = async () => success;

describe("registry acquisition", () => {
  test("preserves registry trust data while acquiring its origin", async () => {
    const root = mkdtempSync(join(tmpdir(), "installer-registry-"));
    const resolveRegistry = async () => ({
      origin: { type: "local" as const, path: root },
      owner: "damat",
      verification: "verified" as const,
      integrity: "sha256-registry",
      packageReference: "@damatjs/auth@git+sha",
    });
    const artifact = await acquireArtifact(
      { type: "registry", ref: "auth@stable" },
      { run, resolveRegistry },
    );
    expect(artifact.request).toEqual({ type: "registry", ref: "auth@stable" });
    expect(artifact.expectedIntegrity).toBe("sha256-registry");
    expect(artifact.packageReference).toBe("@damatjs/auth@git+sha");
    expect(artifact.metadata).toMatchObject({
      registryRef: "auth@stable",
      owner: "damat",
      verification: "verified",
    });
  });

  test("rejects missing resolvers and registry cycles", async () => {
    await expect(
      acquireArtifact({ type: "registry", ref: "a" }, { run }),
    ).rejects.toThrow("resolver");
    const resolveRegistry = async (ref: string) => ({
      origin: { type: "registry" as const, ref: ref === "a" ? "b" : "a" },
    });
    await expect(
      acquireArtifact({ type: "registry", ref: "a" }, { run, resolveRegistry }),
    ).rejects.toThrow("cycle");
  });
});
