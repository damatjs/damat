import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  mock,
} from "bun:test";
import startDamat from "../commands/startDamat";
import PackageManager from "../package/manager";
import ProcessManager from "../commands/manager";

// Boundary-mock child_process so no real `bun run dev` is spawned. We snapshot
// the genuine module and restore it in afterAll to avoid leaking into other
// files (executor.test.ts and others rely on the real child_process).
import * as realChildProcessMod from "child_process";
const REAL_CHILD_PROCESS = { ...realChildProcessMod };

let lastSpawnArgs: any[] = [];
const stdoutPipe = mock((_dest: any) => {});
const stderrPipe = mock((_dest: any) => {});
let childProcessResult: any = {
  stdout: { pipe: stdoutPipe },
  stderr: { pipe: stderrPipe },
};
const fakeSpawn = mock((...args: any[]) => {
  lastSpawnArgs = args;
  return childProcessResult;
});

describe("startDamat", () => {
  beforeAll(() => {
    mock.module("child_process", () => ({
      ...REAL_CHILD_PROCESS,
      spawn: fakeSpawn,
    }));
  });

  afterAll(() => {
    mock.module("child_process", () => ({ ...REAL_CHILD_PROCESS }));
  });

  beforeEach(() => {
    lastSpawnArgs = [];
    fakeSpawn.mockClear();
    stdoutPipe.mockClear();
    stderrPipe.mockClear();
    childProcessResult = {
      stdout: { pipe: stdoutPipe },
      stderr: { pipe: stderrPipe },
    };
  });

  it("should spawn the dev command as an argv array in the given directory", () => {
    const pm = new PackageManager(new ProcessManager());
    const abortController = new AbortController();

    startDamat({ directory: "/project/dir", abortController, packageManager: pm });

    expect(fakeSpawn).toHaveBeenCalledTimes(1);
    const [binary, args, options] = lastSpawnArgs;
    expect([binary, args]).toEqual(pm.getCommandArgs("dev"));
    expect(options.cwd).toBe("/project/dir");
    expect(options.signal).toBe(abortController.signal);
    expect(options.env.PATH ?? options.env.Path).toBeDefined();
    // no shell: the directory only travels via cwd, never a command string
    expect(options.shell).toBeUndefined();
  });

  it("should handle directories with spaces via cwd (no string interpolation)", () => {
    const pm = new PackageManager(new ProcessManager());
    startDamat({
      directory: "/my projects/damat app",
      abortController: new AbortController(),
      packageManager: pm,
    });

    const [, args, options] = lastSpawnArgs;
    expect(options.cwd).toBe("/my projects/damat app");
    expect(args).toEqual(["run", "dev"]);
  });

  it("should pipe child stdout and stderr to the process streams", () => {
    const pm = new PackageManager(new ProcessManager());
    startDamat({
      directory: "/dir",
      abortController: new AbortController(),
      packageManager: pm,
    });

    expect(stdoutPipe).toHaveBeenCalledWith(process.stdout);
    expect(stderrPipe).toHaveBeenCalledWith(process.stderr);
  });

  it("should work when abortController is omitted (signal undefined)", () => {
    const pm = new PackageManager(new ProcessManager());
    startDamat({ directory: "/dir", packageManager: pm } as any);

    const [, , options] = lastSpawnArgs;
    expect(options.signal).toBeUndefined();
  });

  it("should not throw when child stdout/stderr are null", () => {
    childProcessResult = { stdout: null, stderr: null };
    const pm = new PackageManager(new ProcessManager());
    expect(() =>
      startDamat({
        directory: "/dir",
        abortController: new AbortController(),
        packageManager: pm,
      }),
    ).not.toThrow();
  });
});
