import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  createInstallPlan,
  executePlan,
  hashTree,
  type ResolvedArtifact,
} from "../../index";
import { tempProject } from "../fixtures/project";

test("rolls back exact project state after an injected operation failure", async () => {
  const projectDir = tempProject();
  const rootDir = tempProject({ "a.ts": "a", "b.ts": "b" });
  const request = { type: "local" as const, path: rootDir };
  const integrity = hashTree(rootDir);
  const artifact = {
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
    supportedModes: ["source" as const],
  } satisfies ResolvedArtifact;
  const plan = createInstallPlan({
    projectDir,
    artifact,
    recipe: { schemaVersion: 1, id: "blade", kind: "module" },
    lock: { schemaVersion: 1, installations: {} },
  });
  const runtime = {
    run: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
    logger: { info() {}, warn() {}, error() {} },
    afterOperation(completed: number) {
      if (completed === 1) throw new Error("injected");
    },
  };
  await expect(executePlan(plan, runtime)).rejects.toThrow("injected");
  expect(existsSync(join(projectDir, "a.ts"))).toBeFalse();
  expect(existsSync(join(projectDir, "b.ts"))).toBeFalse();
  expect(existsSync(join(projectDir, "damat.lock.json"))).toBeFalse();
});
