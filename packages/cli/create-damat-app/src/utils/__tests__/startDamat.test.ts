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

let lastExecArgs: any[] = [];
const stdoutPipe = mock((_dest: any) => {});
const stderrPipe = mock((_dest: any) => {});
let childProcessResult: any = {
  stdout: { pipe: stdoutPipe },
  stderr: { pipe: stderrPipe },
};
const fakeExec = mock((...args: any[]) => {
  lastExecArgs = args;
  return childProcessResult;
});

describe("startDamat", () => {
  beforeAll(() => {
    mock.module("child_process", () => ({
      ...REAL_CHILD_PROCESS,
      exec: fakeExec,
    }));
  });

  afterAll(() => {
    mock.module("child_process", () => ({ ...REAL_CHILD_PROCESS }));
  });

  beforeEach(() => {
    lastExecArgs = [];
    fakeExec.mockClear();
    stdoutPipe.mockClear();
    stderrPipe.mockClear();
    childProcessResult = {
      stdout: { pipe: stdoutPipe },
      stderr: { pipe: stderrPipe },
    };
  });

  it("should exec the package manager's dev command in the given directory", () => {
    const pm = new PackageManager(new ProcessManager());
    const abortController = new AbortController();

    startDamat({ directory: "/project/dir", abortController, packageManager: pm });

    expect(fakeExec).toHaveBeenCalledTimes(1);
    const [command, options] = lastExecArgs;
    expect(command).toBe(pm.getCommandStr("dev"));
    expect(options.cwd).toBe("/project/dir");
    expect(options.signal).toBe(abortController.signal);
    expect(options.env.PATH ?? options.env.Path).toBeDefined();
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

    const [, options] = lastExecArgs;
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
