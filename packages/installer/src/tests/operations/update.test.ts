import { describe, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { createUpdatePlan, hashTree, type ResolvedArtifact } from "../../index";
import { lock, record, tempProject } from "../fixtures/project";

function artifact(files: Record<string, string>): ResolvedArtifact {
  const rootDir = tempProject(files);
  const request = { type: "local" as const, path: rootDir };
  const integrity = hashTree(rootDir);
  const immutableIdentity = `local:${integrity}`;
  return {
    request,
    rootDir,
    cleanup() {},
    metadata: {},
    integrity,
    immutableIdentity,
    provenance: { request, immutableIdentity, resolvedAt: "now", metadata: {} },
    supportedModes: ["source"],
  };
}

describe("createUpdatePlan", () => {
  test("adds new output and removes paths absent from the next artifact", async () => {
    const projectDir = tempProject({ "old.ts": "old" });
    const plan = await createUpdatePlan({
      projectDir,
      artifact: artifact({ "new.ts": "new" }),
      recipe: { schemaVersion: 1, id: "blade", kind: "module" },
      lock: lock(record(projectDir, ["old.ts"])),
    });
    expect(plan.action).toBe("update");
    expect(plan.operations.map(({ type }) => type)).toEqual([
      "write-file",
      "remove-file",
    ]);
  });

  test("requires confirmation and backs up modified files before replacement", async () => {
    const projectDir = tempProject({ "blade.ts": "old" });
    const state = lock(record(projectDir, ["blade.ts"]));
    writeFileSync(join(projectDir, "blade.ts"), "user");
    const input = {
      projectDir,
      artifact: artifact({ "blade.ts": "new" }),
      recipe: { schemaVersion: 1 as const, id: "blade", kind: "module" },
      lock: state,
    };
    await expect(createUpdatePlan(input)).rejects.toThrow("confirmation");
    const plan = await createUpdatePlan({ ...input, confirmModified: true });
    expect(plan.backupId).toBeString();
    expect(plan.operations[0]).toMatchObject({
      type: "write-file",
      adopt: true,
    });
  });
});
