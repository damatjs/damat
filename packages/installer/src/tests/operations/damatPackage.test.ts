import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  createInstallPlan,
  executePlan,
  hashTree,
  readInstallerLock,
} from "../../index";
import { tempProject } from "../fixtures/project";

describe("Damat package transaction", () => {
  test("installs into .damat and records the backend", async () => {
    const projectDir = tempProject();
    const rootDir = tempProject({ "index.ts": "export default {};" });
    const request = { type: "local" as const, path: rootDir };
    const integrity = hashTree(rootDir);
    const plan = createInstallPlan({
      projectDir,
      artifact: {
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
      },
      recipe: { schemaVersion: 1, id: "blade", kind: "module" },
      lock: { schemaVersion: 1, installations: {} },
      mode: "package",
      packageBackend: "damat",
      experimentalPackage: true,
    });
    await executePlan(plan, {
      run: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
      logger: { info() {}, warn() {}, error() {} },
    });
    expect(
      existsSync(join(projectDir, ".damat/packages/blade/index.ts")),
    ).toBeTrue();
    expect(
      readInstallerLock(projectDir).installations.blade?.packageBackend,
    ).toBe("damat");
  });
});
