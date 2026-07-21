import { expect, test } from "bun:test";
import { createRemovePlan } from "../../index";
import { lock, record, tempProject } from "../fixtures/project";

test("removal includes last-owner packages, version, usage locations, and missing errors", () => {
  const project = tempProject({ "blade.ts": "owned", "use.ts": "useBlade()" });
  const installation = record(project, ["blade.ts"]);
  installation.version = "1.0.0";
  installation.packages = [{ name: "pkg", reference: "1" }];
  installation.usageHints = [{ token: "useBlade" }];
  const plan = createRemovePlan({
    projectDir: project,
    installationId: "blade",
    lock: lock(installation),
  });
  expect(plan.version).toBe("1.0.0");
  expect(plan.operations.at(-1)).toEqual({
    type: "remove-package",
    name: "pkg",
    reference: "1",
  });
  expect(
    plan.warnings.some((warning) => warning.includes("use.ts:1:1")),
  ).toBeTrue();
  expect(() =>
    createRemovePlan({
      projectDir: project,
      installationId: "missing",
      lock: lock(installation),
    }),
  ).toThrow("not found");
});
