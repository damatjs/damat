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

test("restores package manifests and lockfiles after every adapter fails", async () => {
  for (const manager of Object.keys(locks) as PackageManagerName[]) {
    const lockfile = locks[manager];
    const project = tempProject({
      "package.json": JSON.stringify({ packageManager: `${manager}@1` }),
      [lockfile]: "before-lock",
    });
    const beforeManifest = readFileSync(join(project, "package.json"), "utf8");
    const request = { type: "npm" as const, name: "pkg", version: "1" };
    const plan = {
      schemaVersion: 1,
      action: "add",
      projectDir: project,
      installationId: "blade",
      kind: "module",
      mode: "package",
      provenance: {
        request,
        immutableIdentity: "npm:pkg@1",
        resolvedAt: "now",
        metadata: {},
      },
      artifactIntegrity: "a",
      recipeIntegrity: "r",
      verification: "verified",
      usageHints: [],
      operations: [{ type: "add-package", name: "pkg", reference: "1" }],
      warnings: [],
    } satisfies InstallerPlan;
    const run = async () => {
      writeFileSync(join(project, "package.json"), "changed");
      writeFileSync(join(project, lockfile), "changed");
      return { exitCode: 1, stdout: "", stderr: "injected package failure" };
    };
    await expect(
      executePlan(plan, {
        run,
        packageManager: manager,
        logger: { info() {}, warn() {}, error() {} },
      }),
    ).rejects.toThrow("injected package failure");
    expect(readFileSync(join(project, "package.json"), "utf8")).toBe(
      beforeManifest,
    );
    expect(readFileSync(join(project, lockfile), "utf8")).toBe("before-lock");
  }
});
