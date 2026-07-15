import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createRemovePlan } from "../../index";
import { lock, record, tempProject } from "../fixtures/project";

describe("remove planning", () => {
  test("removes unchanged files without creating a backup", () => {
    const projectDir = tempProject({ "src/blade.ts": "installed" });
    const plan = createRemovePlan({
      projectDir,
      installationId: "blade",
      lock: lock(record(projectDir, ["src/blade.ts"])),
    });
    expect(plan.operations[0]?.type).toBe("remove-file");
    expect(existsSync(join(projectDir, ".damat/backups"))).toBeFalse();
  });

  test("requires confirmation and backs up only modified owned files", () => {
    const projectDir = tempProject({
      "a.ts": "installed",
      "b.ts": "installed",
    });
    const state = lock(record(projectDir, ["a.ts", "b.ts"]));
    writeFileSync(join(projectDir, "a.ts"), "user change");
    expect(() =>
      createRemovePlan({ projectDir, installationId: "blade", lock: state }),
    ).toThrow("confirmation");
    const plan = createRemovePlan({
      projectDir,
      installationId: "blade",
      lock: state,
      confirmModified: true,
    });
    const backup = plan.backupId!;
    const manifest = JSON.parse(
      readFileSync(
        join(projectDir, ".damat/backups", backup, "manifest.json"),
        "utf8",
      ),
    );
    expect(manifest.files.map((file: { path: string }) => file.path)).toEqual([
      "a.ts",
    ]);
  });
});
