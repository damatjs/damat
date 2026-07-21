import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  resetCliMock,
  restoreCliEnvironment,
  runDamat,
  setSpawnResult,
  spawnCalls,
} from "./tool-cli-fixture";

beforeEach(resetCliMock);
afterEach(restoreCliEnvironment);

describe("runDamat", () => {
  test("uses the default CLI and configured app directory", () => {
    process.env.DAMAT_APP_DIR = "/srv/app";
    runDamat(["module", "add", "user"]);
    expect(spawnCalls[0]).toMatchObject({
      cmd: "damat",
      args: ["module", "add", "user"],
      opts: { cwd: "/srv/app" },
    });
  });

  test("splits a configured CLI command and prefix arguments", () => {
    process.env.DAMAT_CLI = "bun /path/cli.ts";
    runDamat(["module", "list"]);
    expect(spawnCalls[0]).toMatchObject({
      cmd: "bun",
      args: ["/path/cli.ts", "module", "list"],
    });
  });

  test("combines output and reflects the process status", () => {
    setSpawnResult({ status: 0, stdout: "out", stderr: "warn" });
    expect(runDamat(["x"])).toEqual({ ok: true, output: "out\nwarn" });
    setSpawnResult({ status: 1, stdout: "", stderr: "failed" });
    expect(runDamat(["x"])).toEqual({ ok: false, output: "failed" });
  });

  test("explains a spawn failure", () => {
    setSpawnResult({
      status: null,
      stdout: "",
      stderr: "",
      error: new Error("spawn damat ENOENT"),
    });
    const result = runDamat(["x"]);
    expect(result.ok).toBe(false);
    expect(result.output).toContain('Failed to run "damat"');
    expect(result.output).toContain("Set DAMAT_CLI");
  });
});
