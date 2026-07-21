import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createInstallPlan,
  executePlan,
  hashTree,
  readInstallerLock,
  type ResolvedArtifact,
} from "../../index";
import { tempProject } from "../fixtures/project";

function plan(projectDir: string) {
  const rootDir = tempProject({ "src/blade.ts": "installed" });
  const request = { type: "local" as const, path: rootDir };
  const integrity = hashTree(rootDir);
  const artifact: ResolvedArtifact = {
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
    supportedModes: ["source"],
  };
  return createInstallPlan({
    projectDir,
    artifact,
    recipe: { schemaVersion: 1, id: "blade", kind: "module" },
    lock: { schemaVersion: 1, installations: {} },
  });
}

const runtime = {
  run: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
  logger: { info() {}, warn() {}, error() {} },
};

describe("executePlan add", () => {
  test("supports dry run then writes files and lock last", async () => {
    const project = tempProject();
    const install = plan(project);
    await executePlan(install, { ...runtime, dryRun: true });
    expect(existsSync(join(project, "src/blade.ts"))).toBeFalse();
    await executePlan(install, runtime);
    expect(readFileSync(join(project, "src/blade.ts"), "utf8")).toBe(
      "installed",
    );
    expect(readInstallerLock(project).installations.blade?.files[0]?.path).toBe(
      "src/blade.ts",
    );
  });

  test("is idempotent for the same installed content", async () => {
    const project = tempProject();
    const install = plan(project);
    await executePlan(install, runtime);
    writeFileSync(join(project, "unrelated.txt"), "user");
    await executePlan(install, runtime);
    expect(readFileSync(join(project, "unrelated.txt"), "utf8")).toBe("user");
  });
});
