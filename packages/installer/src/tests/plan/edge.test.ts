import { expect, test } from "bun:test";
import {
  createAddPlan,
  createPackageOperations,
  hasModifiedOwnedFiles,
  type ResolvedArtifact,
} from "../../index";
import { tempProject } from "../fixtures/project";

const request = { type: "local" as const, path: "." };
const artifact = {
  request,
  rootDir: tempProject(),
  cleanup() {},
  metadata: {},
  integrity: "sha256:a",
  immutableIdentity: "local:a",
  provenance: {
    request,
    immutableIdentity: "local:a",
    resolvedAt: "now",
    metadata: {},
  },
  supportedModes: ["source" as const],
} satisfies ResolvedArtifact;

test("covers add wrapper, explicit package metadata, and modification helper", async () => {
  const plan = await createAddPlan({
    projectDir: ".",
    artifact,
    recipe: { schemaVersion: 1, id: "blade", kind: "module", mappings: [] },
    lock: { schemaVersion: 1, installations: {} },
  });
  expect(plan.action).toBe("add");
  const packageArtifact = {
    ...artifact,
    supportedModes: ["package" as const],
    packageReference: "fallback@1",
  };
  expect(
    createPackageOperations(packageArtifact, {
      schemaVersion: 1,
      id: "blade",
      kind: "module",
      package: { name: "explicit", ref: "2" },
    })[0],
  ).toEqual({ type: "add-package", name: "explicit", reference: "2" });
  expect(() =>
    createPackageOperations(artifact, {
      schemaVersion: 1,
      id: "blade",
      kind: "module",
    }),
  ).toThrow("immutable");
  expect(
    hasModifiedOwnedFiles({
      conflicts: [{ code: "modified-owned", target: "a" }],
      warnings: [],
      packageOwners: {},
    }),
  ).toBeTrue();
  expect(
    hasModifiedOwnedFiles({ conflicts: [], warnings: [], packageOwners: {} }),
  ).toBeFalse();
});
