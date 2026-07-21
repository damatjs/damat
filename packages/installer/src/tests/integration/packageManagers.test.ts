import { expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  executePlan,
  type InstallerPlan,
  type PackageManagerName,
} from "../../index";
import { tempProject } from "../fixtures/project";

const locks: Record<PackageManagerName, string> = {
  bun: "bun.lock",
  npm: "package-lock.json",
  pnpm: "pnpm-lock.yaml",
  yarn: "yarn.lock",
};

function plan(projectDir: string): InstallerPlan {
  const request = { type: "npm" as const, name: "pkg", version: "1.0.0" };
  return {
    schemaVersion: 1,
    action: "add",
    projectDir,
    installationId: "blade",
    kind: "module",
    mode: "package",
    provenance: {
      request,
      immutableIdentity: "npm:pkg@1.0.0",
      resolvedAt: "now",
      metadata: {},
    },
    artifactIntegrity: "sha256:a",
    recipeIntegrity: "sha256:r",
    verification: "verified",
    usageHints: [],
    operations: [{ type: "add-package", name: "pkg", reference: "1.0.0" }],
    warnings: [],
  };
}

test("executes package plans through every target adapter", async () => {
  for (const manager of Object.keys(locks) as PackageManagerName[]) {
    const project = tempProject({
      "package.json": JSON.stringify({ packageManager: `${manager}@1` }),
      [locks[manager]]: "old",
    });
    const commands: string[][] = [];
    const run = async (spec: { args: string[] }) => {
      commands.push(spec.args);
      writeFileSync(join(project, "package.json"), "new-manifest");
      writeFileSync(join(project, locks[manager]), "new-lock");
      return { exitCode: 0, stdout: "", stderr: "" };
    };
    const result = await executePlan(plan(project), {
      run,
      packageManager: manager,
      logger: { info() {}, warn() {}, error() {} },
    });
    expect(result.nodeModules).toBe("best-effort");
    expect(commands[0]).toContain("--ignore-scripts");
    expect(readFileSync(join(project, locks[manager]), "utf8")).toBe(
      "new-lock",
    );
  }
});
