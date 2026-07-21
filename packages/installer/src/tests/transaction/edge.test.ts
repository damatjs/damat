import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createJournal,
  executePlan,
  readJournal,
  type InstallerPlan,
} from "../../index";
import { tempProject } from "../fixtures/project";

test("reads empty journals and rejects ownership conflicts before mutation", async () => {
  const journalProject = tempProject();
  const journal = createJournal(journalProject, "empty");
  expect(readJournal(journalProject, "empty")).toEqual([]);
  journal.complete();
  const project = tempProject({ "target.ts": "user" });
  const source = join(tempProject({ "source.ts": "new" }), "source.ts");
  const request = { type: "local" as const, path: "." };
  const plan = {
    schemaVersion: 1,
    action: "add",
    projectDir: project,
    installationId: "blade",
    kind: "module",
    mode: "source",
    provenance: {
      request,
      immutableIdentity: "local:x",
      resolvedAt: "now",
      metadata: {},
    },
    artifactIntegrity: "a",
    recipeIntegrity: "r",
    verification: "verified",
    usageHints: [],
    operations: [
      {
        type: "write-file",
        source,
        target: "target.ts",
        checksum: "not-reached",
      },
    ],
    warnings: [],
  } satisfies InstallerPlan;
  const runtime = {
    run: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
    logger: { info() {}, warn() {}, error() {} },
  };
  await expect(executePlan(plan, runtime)).rejects.toThrow("unowned-target");
  expect(readFileSync(join(project, "target.ts"), "utf8")).toBe("user");
});
