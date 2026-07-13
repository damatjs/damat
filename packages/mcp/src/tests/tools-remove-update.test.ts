import { beforeEach, describe, expect, mock, test } from "bun:test";

// Same OS-boundary mock as tools-add-module.test.ts: spawnSync is replaced so
// no child process launches and we inspect exactly what would be executed.
type SpawnResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: Error;
};

let spawnCalls: { cmd: string; args: string[]; opts: any }[] = [];
let nextSpawn: SpawnResult = { status: 0, stdout: "Done.", stderr: "" };

mock.module("node:child_process", () => ({
  spawnSync: (cmd: string, args: string[], opts: any) => {
    spawnCalls.push({ cmd, args, opts });
    return nextSpawn;
  },
}));

const { removeModule } = await import("../tools/remove-module");
const { updateModule } = await import("../tools/update-module");

beforeEach(() => {
  spawnCalls = [];
  nextSpawn = { status: 0, stdout: "Done.", stderr: "" };
});

/** The argv passed to spawnSync for the most recent call. */
function lastArgs(): string[] {
  return spawnCalls[spawnCalls.length - 1]!.args;
}

describe("remove_module", () => {
  test("rejects a missing id without invoking the CLI", async () => {
    const res = await removeModule.handler({});
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/'id' string is required/);
    expect(spawnCalls).toHaveLength(0);
  });

  test("rejects a non-string id", async () => {
    const res = await removeModule.handler({ id: 42 });
    expect(res.isError).toBe(true);
    expect(spawnCalls).toHaveLength(0);
  });

  test("builds the minimal `module remove <id>` command", async () => {
    await removeModule.handler({ id: "user" });
    expect(lastArgs()).toEqual(["module", "remove", "user"]);
  });

  test("appends --dir, --force, --clean-env, and --dry-run flags", async () => {
    await removeModule.handler({
      id: "user",
      dir: "src/mods",
      force: true,
      cleanEnv: true,
      dryRun: true,
    });
    expect(lastArgs()).toEqual([
      "module",
      "remove",
      "user",
      "--dir",
      "src/mods",
      "--force",
      "--clean-env",
      "--dry-run",
    ]);
  });

  test("returns the CLI output on success", async () => {
    nextSpawn = { status: 0, stdout: "Removed src/modules/user", stderr: "" };
    const res = await removeModule.handler({ id: "user" });
    expect(res.isError).toBe(false);
    expect(res.text).toContain("Removed src/modules/user");
  });

  test("marks isError and surfaces output on failure", async () => {
    nextSpawn = { status: 1, stdout: "", stderr: "Refusing to remove" };
    const res = await removeModule.handler({ id: "user" });
    expect(res.isError).toBe(true);
    expect(res.text).toContain("Refusing to remove");
  });

  test("uses a default failure message when output is empty", async () => {
    nextSpawn = { status: 1, stdout: "", stderr: "" };
    const res = await removeModule.handler({ id: "user" });
    expect(res.isError).toBe(true);
    expect(res.text).toBe("Remove failed.");
  });
});

describe("update_module", () => {
  test("rejects a missing id without invoking the CLI", async () => {
    const res = await updateModule.handler({});
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/'id' string is required/);
    expect(spawnCalls).toHaveLength(0);
  });

  test("builds the minimal `module update <id>` command", async () => {
    await updateModule.handler({ id: "user" });
    expect(lastArgs()).toEqual(["module", "update", "user"]);
  });

  test("appends --dir, --yes, --allow-unverified, --allow-scripts, --dry-run", async () => {
    await updateModule.handler({
      id: "user",
      dir: "src/mods",
      yes: true,
      allowUnverified: true,
      allowScripts: true,
      dryRun: true,
    });
    expect(lastArgs()).toEqual([
      "module",
      "update",
      "user",
      "--dir",
      "src/mods",
      "--yes",
      "--allow-unverified",
      "--allow-scripts",
      "--dry-run",
    ]);
  });

  test("returns the CLI output on success", async () => {
    nextSpawn = { status: 0, stdout: "Updated module at src/modules/user", stderr: "" };
    const res = await updateModule.handler({ id: "user" });
    expect(res.isError).toBe(false);
    expect(res.text).toContain("Updated module");
  });

  test("marks isError on failure with a default message when output is empty", async () => {
    nextSpawn = { status: 1, stdout: "", stderr: "" };
    const res = await updateModule.handler({ id: "user" });
    expect(res.isError).toBe(true);
    expect(res.text).toBe("Update failed.");
  });
});
