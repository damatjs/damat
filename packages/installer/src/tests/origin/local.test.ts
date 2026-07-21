import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { acquireArtifact } from "../../index";
import { success } from "../fixtures/runtime";

const ports = { run: async () => success };

describe("local acquisition", () => {
  test("resolves a local directory without copying it", async () => {
    const root = mkdtempSync(join(tmpdir(), "installer-local-"));
    writeFileSync(join(root, "recipe.json"), "{}");
    const artifact = await acquireArtifact(
      { type: "local", path: root },
      ports,
    );
    expect(artifact.rootDir).toBe(resolve(root));
    expect(artifact.metadata).toEqual({ sourcePath: resolve(root) });
    artifact.cleanup();
    artifact.cleanup();
    expect(existsSync(root)).toBeTrue();
  });

  test("rejects missing local inputs", async () => {
    await expect(
      acquireArtifact(
        { type: "local", path: "/missing/damat-artifact" },
        ports,
      ),
    ).rejects.toThrow("not found");
  });
});
