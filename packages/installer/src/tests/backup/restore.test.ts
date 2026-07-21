import { expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createBackup, restoreBackup } from "../../index";
import { record, tempProject } from "../fixtures/project";

test("restores exact bytes from a modified-file backup", () => {
  const project = tempProject({ "blade.ts": "user bytes" });
  const installation = record(project, ["blade.ts"]);
  const backup = createBackup(project, installation, ["blade.ts"]);
  writeFileSync(join(project, "blade.ts"), "removed or replaced");
  const result = restoreBackup(project, backup.id);
  expect(readFileSync(join(project, "blade.ts"), "utf8")).toBe("user bytes");
  expect(result.restored).toEqual(["blade.ts"]);
});
