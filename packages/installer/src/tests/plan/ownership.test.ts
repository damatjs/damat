import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  analyzeOwnership,
  hashBytes,
  type InstallerLock,
  type InstallerPlan,
} from "../../index";
const projectDir = mkdtempSync(join(tmpdir(), "installer-owner-"));
const provenance = {
  request: { type: "local" as const, path: "." },
  immutableIdentity: "local:x",
  resolvedAt: "now",
  metadata: {},
};
const plan = (target: string, adopt = false): InstallerPlan => ({
  schemaVersion: 1,
  action: "add",
  projectDir,
  installationId: "blade",
  mode: "source",
  provenance,
  artifactIntegrity: "a",
  recipeIntegrity: "r",
  operations: [
    {
      type: "write-file",
      source: "/source",
      target,
      checksum: "next",
      ...(adopt && { adopt }),
    },
  ],
  warnings: [],
});
const lock = (
  owner = "blade",
  checksum = hashBytes(Buffer.from("old")),
): InstallerLock => ({
  schemaVersion: 1,
  installations: {
    [owner]: {
      artifactId: owner,
      kind: "module",
      mode: "source",
      provenance,
      artifactIntegrity: "a",
      recipeIntegrity: "r",
      verification: "verified",
      installedAt: "now",
      files: [{ path: "target.ts", checksum }],
      packages: [{ name: "zod", reference: "^4" }],
      usageHints: [],
    },
  },
});
describe("analyzeOwnership", () => {
  test("reports unowned targets unless explicitly adopted", () => {
    writeFileSync(join(projectDir, "unowned.ts"), "user");
    expect(
      analyzeOwnership(plan("unowned.ts"), {
        schemaVersion: 1,
        installations: {},
      }).conflicts[0]?.code,
    ).toBe("unowned-target");
    expect(
      analyzeOwnership(plan("unowned.ts", true), {
        schemaVersion: 1,
        installations: {},
      }).conflicts,
    ).toEqual([]);
  });
  test("detects modified, cross-owned, missing, and duplicate targets", () => {
    writeFileSync(join(projectDir, "target.ts"), "changed");
    expect(analyzeOwnership(plan("target.ts"), lock()).conflicts[0]?.code).toBe(
      "modified-owned",
    );
    expect(
      analyzeOwnership(plan("target.ts"), lock("other")).conflicts[0]?.code,
    ).toBe("owned-by-other");
    const missing = plan("target.ts");
    missing.projectDir = mkdtempSync(join(tmpdir(), "installer-missing-"));
    expect(analyzeOwnership(missing, lock()).warnings[0]?.code).toBe(
      "missing-owned",
    );
    const duplicate = plan("new.ts");
    duplicate.operations.push(duplicate.operations[0]!);
    expect(analyzeOwnership(duplicate, lock()).conflicts[0]?.code).toBe(
      "duplicate-target",
    );
  });
});
