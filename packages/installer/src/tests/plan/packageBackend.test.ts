import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import {
  createInstallPlan,
  hashTree,
  type ResolvedArtifact,
} from "../../index";
import { tempProject } from "../fixtures/project";

function artifact(): ResolvedArtifact {
  const rootDir = tempProject({ "index.ts": "export default {};" });
  const request = { type: "local" as const, path: rootDir };
  const integrity = hashTree(rootDir);
  return {
    request,
    rootDir,
    cleanup() {},
    metadata: {},
    integrity,
    immutableIdentity: `local:${integrity}`,
    provenance: {
      request,
      immutableIdentity: `local:${integrity}`,
      resolvedAt: "now",
      metadata: {},
    },
    supportedModes: ["source", "package"],
    packageReference: "@example/blade@1.0.0",
  };
}

const common = {
  projectDir: "/project",
  recipe: { schemaVersion: 1 as const, id: "blade", kind: "module" },
  lock: { schemaVersion: 1 as const, installations: {} },
  mode: "package" as const,
};

describe("package backends", () => {
  test("requires alpha opt-in and defaults an opted-in package to node", () => {
    expect(() =>
      createInstallPlan({ ...common, artifact: artifact() }),
    ).toThrow("experimental");
    const plan = createInstallPlan({
      ...common,
      artifact: artifact(),
      experimentalPackage: true,
    });
    expect(plan.packageBackend).toBe("node");
  });

  test("creates an immutable project-local Damat package plan", () => {
    const plan = createInstallPlan({
      ...common,
      artifact: artifact(),
      experimentalPackage: true,
      packageBackend: "damat",
    });
    expect(plan.packageBackend).toBe("damat");
    expect(plan.operations[0]).toMatchObject({
      type: "write-file",
      target: ".damat/packages/blade/index.ts",
    });
  });

  test("rejects external dependencies for the Damat alpha backend", () => {
    const value = artifact();
    writeFileSync(
      `${value.rootDir}/package.json`,
      JSON.stringify({ dependencies: { zod: "^4" } }),
    );
    expect(() =>
      createInstallPlan({
        ...common,
        artifact: value,
        experimentalPackage: true,
        packageBackend: "damat",
      }),
    ).toThrow("self-contained");
  });
});
