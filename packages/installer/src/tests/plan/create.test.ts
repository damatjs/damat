import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createInstallPlan,
  hashTree,
  type InstallerLock,
  type ResolvedArtifact,
} from "../../index";

function fixture(): ResolvedArtifact {
  const rootDir = mkdtempSync(join(tmpdir(), "installer-plan-"));
  writeFileSync(join(rootDir, "index.ts"), "export {};");
  const request = {
    type: "npm" as const,
    name: "@example/blade",
    version: "1.0.0",
  };
  const immutableIdentity = "npm:@example/blade@1.0.0";
  return {
    request,
    rootDir,
    cleanup() {},
    metadata: {},
    integrity: hashTree(rootDir),
    immutableIdentity,
    provenance: { request, immutableIdentity, resolvedAt: "now", metadata: {} },
    supportedModes: ["source", "package"],
    packageReference: "@example/blade@1.0.0",
  };
}

const lock: InstallerLock = { schemaVersion: 1, installations: {} };

describe("createInstallPlan", () => {
  test("creates a checksum-bearing source plan", () => {
    const plan = createInstallPlan({
      projectDir: "/project",
      artifact: fixture(),
      recipe: { schemaVersion: 1, id: "blade", kind: "module" },
      mode: "source",
      lock,
    });
    expect(plan.mode).toBe("source");
    expect(plan.operations).toEqual([
      {
        type: "write-file",
        source: expect.any(String),
        target: "index.ts",
        checksum: expect.any(String),
      },
    ]);
  });

  test("creates immutable package operations with declared dependencies", () => {
    const plan = createInstallPlan({
      projectDir: "/project",
      artifact: fixture(),
      recipe: {
        schemaVersion: 1,
        id: "blade",
        kind: "module",
        packages: { zod: "^4", alpha: "1" },
      },
      mode: "package",
      lock,
    });
    expect(plan.operations).toEqual([
      { type: "add-package", name: "@example/blade", reference: "1.0.0" },
      { type: "add-package", name: "alpha", reference: "1" },
      { type: "add-package", name: "zod", reference: "^4" },
    ]);
    expect(JSON.parse(JSON.stringify(plan))).toEqual(plan);
  });

  test("enforces security policy before returning a plan", () => {
    const artifact = fixture();
    artifact.metadata.verification = "rejected";
    const input = {
      projectDir: "/project",
      artifact,
      recipe: { schemaVersion: 1 as const, id: "blade", kind: "module" },
      lock,
    };
    expect(() => createInstallPlan(input)).toThrow("rejected");
    artifact.metadata.verification = "unverified";
    expect(() =>
      createInstallPlan({ ...input, securityPolicy: "require" }),
    ).toThrow("unverified");
  });
});
