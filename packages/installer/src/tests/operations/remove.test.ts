import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  createRemovePlan,
  executePlan,
  readInstallerLock,
  writeInstallerLock,
} from "../../index";
import { lock, record, tempProject } from "../fixtures/project";

test("executes removal and deletes the lock record last", async () => {
  const projectDir = tempProject({ "blade.ts": "installed" });
  const state = lock(record(projectDir, ["blade.ts"]));
  writeInstallerLock(projectDir, state);
  const plan = createRemovePlan({
    projectDir,
    installationId: "blade",
    lock: state,
  });
  const runtime = {
    run: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
    logger: { info() {}, warn() {}, error() {} },
  };
  await executePlan(plan, runtime);
  expect(existsSync(join(projectDir, "blade.ts"))).toBeFalse();
  expect(readInstallerLock(projectDir).installations).toEqual({});
});
