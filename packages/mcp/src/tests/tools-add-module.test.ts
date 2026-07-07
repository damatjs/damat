import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

// Drive add_module (and runDamat) through the real code path, mocking only the
// OS boundary (spawnSync) so no child process is launched and we can inspect
// exactly what would be executed. This single spawnSync mock is shared by both
// the runDamat and add_module suites in this file — keeping the global
// `node:child_process` mock in one place avoids cross-file mock conflicts.
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

const { addModule } = await import("../tools/add-module");
const { runDamat } = await import("../app/cli");

const savedCli = process.env.DAMAT_CLI;
const savedAppDir = process.env.DAMAT_APP_DIR;

beforeEach(() => {
  spawnCalls = [];
  nextSpawn = { status: 0, stdout: "Done.", stderr: "" };
  delete process.env.DAMAT_CLI; // default binary = "damat"
  delete process.env.DAMAT_APP_DIR;
});

afterEach(() => {
  if (savedCli === undefined) delete process.env.DAMAT_CLI;
  else process.env.DAMAT_CLI = savedCli;
  if (savedAppDir === undefined) delete process.env.DAMAT_APP_DIR;
  else process.env.DAMAT_APP_DIR = savedAppDir;
});

/** The argv passed to spawnSync for the most recent call. */
function lastArgs(): string[] {
  return spawnCalls[spawnCalls.length - 1]!.args;
}

describe("runDamat", () => {
  test("spawns the default `damat` binary in the app dir", () => {
    process.env.DAMAT_APP_DIR = "/srv/app";
    runDamat(["module", "add", "user"]);
    expect(spawnCalls[0].cmd).toBe("damat");
    expect(spawnCalls[0].args).toEqual(["module", "add", "user"]);
    expect(spawnCalls[0].opts.cwd).toBe("/srv/app");
  });

  test("splits DAMAT_CLI into command + prefix args", () => {
    process.env.DAMAT_CLI = "bun /path/cli.ts";
    runDamat(["module", "list"]);
    expect(spawnCalls[0].cmd).toBe("bun");
    expect(spawnCalls[0].args).toEqual(["/path/cli.ts", "module", "list"]);
  });

  test("reports ok=true and combined stdout/stderr on status 0", () => {
    nextSpawn = { status: 0, stdout: "out", stderr: "warn" };
    const res = runDamat(["x"]);
    expect(res.ok).toBe(true);
    expect(res.output).toBe("out\nwarn");
  });

  test("reports ok=false on a non-zero exit status", () => {
    nextSpawn = { status: 1, stdout: "", stderr: "failed" };
    const res = runDamat(["x"]);
    expect(res.ok).toBe(false);
    expect(res.output).toBe("failed");
  });

  test("returns a helpful message when the binary cannot be spawned", () => {
    nextSpawn = {
      status: null,
      stdout: "",
      stderr: "",
      error: new Error("spawn damat ENOENT"),
    };
    const res = runDamat(["x"]);
    expect(res.ok).toBe(false);
    expect(res.output).toMatch(/Failed to run "damat"/);
    expect(res.output).toMatch(/spawn damat ENOENT/);
    expect(res.output).toMatch(/Set DAMAT_CLI/);
  });
});

describe("add_module — argument validation", () => {
  test("rejects a missing source without invoking the CLI", async () => {
    const res = await addModule.handler({});
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/'source' string is required/);
    expect(spawnCalls).toHaveLength(0);
  });

  test("rejects a non-string source", async () => {
    const res = await addModule.handler({ source: 123 });
    expect(res.isError).toBe(true);
    expect(spawnCalls).toHaveLength(0);
  });
});

describe("add_module — command building", () => {
  test("builds the minimal `module add <source>` command", async () => {
    await addModule.handler({ source: "user" });
    expect(lastArgs()).toEqual(["module", "add", "user"]);
  });

  test("appends --name, --dir, and --force flags", async () => {
    await addModule.handler({
      source: "damatjs/user@0.2.0",
      name: "auth",
      dir: "src/mods",
      force: true,
    });
    expect(lastArgs()).toEqual([
      "module",
      "add",
      "damatjs/user@0.2.0",
      "--name",
      "auth",
      "--dir",
      "src/mods",
      "--force",
    ]);
  });

  test("omits --force when falsy", async () => {
    await addModule.handler({ source: "user", force: false });
    expect(lastArgs()).toEqual(["module", "add", "user"]);
  });

  test("appends the security opt-ins only when explicitly true", async () => {
    await addModule.handler({
      source: "https://github.com/acme/mod.git",
      allowUnverified: true,
      allowScripts: true,
    });
    expect(lastArgs()).toEqual([
      "module",
      "add",
      "https://github.com/acme/mod.git",
      "--allow-unverified",
      "--allow-scripts",
    ]);
  });

  test("omits the security opt-ins by default (unverified installs are refused downstream)", async () => {
    await addModule.handler({
      source: "acme/mod",
      allowUnverified: false,
      allowScripts: false,
    });
    expect(lastArgs()).toEqual(["module", "add", "acme/mod"]);
  });

  test("declares the opt-ins in the input schema so the model must set them deliberately", () => {
    const props = (addModule.inputSchema as any).properties;
    expect(Object.keys(props)).toContain("allowUnverified");
    expect(Object.keys(props)).toContain("allowScripts");
    expect(addModule.description).toContain("allowUnverified");
  });
});

describe("add_module — result envelopes", () => {
  test("returns the CLI output on success", async () => {
    nextSpawn = { status: 0, stdout: "Installed user@0.2.0", stderr: "" };
    const res = await addModule.handler({ source: "user" });
    expect(res.isError).toBe(false);
    expect(res.text).toBe("Installed user@0.2.0");
  });

  test("uses a default success message when output is empty", async () => {
    nextSpawn = { status: 0, stdout: "", stderr: "" };
    const res = await addModule.handler({ source: "user" });
    expect(res.isError).toBe(false);
    expect(res.text).toBe("Done.");
  });

  test("marks isError and surfaces output on failure", async () => {
    nextSpawn = { status: 1, stdout: "", stderr: "boom: module not found" };
    const res = await addModule.handler({ source: "ghost" });
    expect(res.isError).toBe(true);
    expect(res.text).toBe("boom: module not found");
  });

  test("uses a default failure message when output is empty", async () => {
    nextSpawn = { status: 1, stdout: "", stderr: "" };
    const res = await addModule.handler({ source: "ghost" });
    expect(res.isError).toBe(true);
    expect(res.text).toBe("Install failed.");
  });
});
