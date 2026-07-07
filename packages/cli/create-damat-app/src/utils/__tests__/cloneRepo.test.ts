import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  mock,
  spyOn,
} from "bun:test";
import path from "path";
import cloneRepo, {
  runCloneRepo,
  initializeFreshGit,
} from "../actions/cloneRepo";

// Snapshot genuine modules to restore in afterAll (mock.module is global for the
// whole run; files run sequentially). The SUT reads these via live bindings.
import * as realExecutorMod from "../commands/executor";
import * as realLogMod from "../logger/message";
import * as realFsMod from "fs";
import * as realChildProcessMod from "child_process";
import * as realAbortMod from "../commands/createAbortController";

const REAL_EXECUTE = realExecutorMod.default;
const REAL_LOG = realLogMod.default;
const REAL_FS = { ...realFsMod };
const REAL_CHILD_PROCESS = { ...realChildProcessMod };
const REAL_ABORT = { ...realAbortMod };

// execute: capture commands, never spawn anything.
let executeImpl: (cmd: any, opts: any) => Promise<any> = async () => ({
  stdout: "",
  stderr: "",
});
const executeCalls: any[] = [];
const mockExecute = mock(async (cmd: any, opts: any) => {
  executeCalls.push([cmd, opts]);
  return executeImpl(cmd, opts);
});

const mockLogMessage = mock((_o: any) => {});

let rmSyncImpl: (p: string, o?: any) => void = () => {};
const mockRmSync = mock((p: string, o?: any) => rmSyncImpl(p, o));
let existsSyncImpl: (p: string) => boolean = () => true;
const mockExistsSync = mock((p: string) => existsSyncImpl(p));

const mockExecFileSync = mock((_c: string, _a: string[]) => Buffer.from(""));

let isAbortErrorImpl: (e: any) => boolean = () => false;

function applyMocks() {
  mock.module("../commands/executor", () => ({ default: mockExecute }));
  mock.module("../logger/message", () => ({ default: mockLogMessage }));
  mock.module("fs", () => ({
    ...REAL_FS,
    default: { ...(REAL_FS as any).default, rmSync: mockRmSync, existsSync: mockExistsSync },
    rmSync: mockRmSync,
    existsSync: mockExistsSync,
  }));
  mock.module("child_process", () => ({
    ...REAL_CHILD_PROCESS,
    execFileSync: mockExecFileSync,
  }));
  mock.module("../commands/createAbortController", () => ({
    ...REAL_ABORT,
    isAbortError: (e: any) => isAbortErrorImpl(e),
  }));
}

describe("cloneRepo actions", () => {
  let exitSpy: ReturnType<typeof spyOn>;

  beforeAll(() => {
    applyMocks();
  });

  afterAll(() => {
    mock.module("../commands/executor", () => ({ default: REAL_EXECUTE }));
    mock.module("../logger/message", () => ({ default: REAL_LOG }));
    mock.module("fs", () => ({ ...REAL_FS }));
    mock.module("child_process", () => ({ ...REAL_CHILD_PROCESS }));
    mock.module("../commands/createAbortController", () => ({ ...REAL_ABORT }));
  });

  beforeEach(() => {
    executeCalls.length = 0;
    executeImpl = async () => ({ stdout: "", stderr: "" });
    rmSyncImpl = () => {};
    existsSyncImpl = () => true;
    isAbortErrorImpl = () => false;
    mockExecute.mockClear();
    mockLogMessage.mockClear();
    mockRmSync.mockClear();
    mockExistsSync.mockClear();
    mockExecFileSync.mockClear();
    exitSpy = spyOn(process, "exit").mockImplementation(((_c?: number) =>
      undefined as never) as any);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  describe("cloneRepo (default export)", () => {
    it("should clone the default project repo when no repoUrl/isModule", async () => {
      await cloneRepo({ directoryName: "my-app" });
      expect(mockExecute).toHaveBeenCalledTimes(1);
      const [commandArg] = executeCalls[0]!;
      expect(commandArg[0]).toBe("git");
      expect(commandArg[1]).toEqual([
        "clone",
        "--depth",
        "1",
        "--",
        "https://github.com/damatjs/damat-starter-default",
        "my-app",
      ]);
    });

    it("should clone the default MODULE repo when isModule is true", async () => {
      await cloneRepo({ directoryName: "mod", isModule: true });
      const [commandArg] = executeCalls[0]!;
      expect(commandArg[1]).toContain(
        "https://github.com/damatjs/damat-starter-module",
      );
    });

    it("should use a custom repoUrl when provided", async () => {
      await cloneRepo({ directoryName: "x", repoUrl: "https://example.com/r" });
      const [commandArg] = executeCalls[0]!;
      expect(commandArg[1]).toContain("https://example.com/r");
    });

    it("should keep a directory name with spaces as ONE argv entry", async () => {
      await cloneRepo({ directoryName: "my app dir" });
      const [commandArg] = executeCalls[0]!;
      expect(commandArg[1]).toContain("my app dir");
    });

    it("should place `--` before the repo URL so it can never be parsed as a git flag", async () => {
      await cloneRepo({ directoryName: "x", repoUrl: "https://example.com/r" });
      const [commandArg] = executeCalls[0]!;
      const args = commandArg[1] as string[];
      expect(args.indexOf("--")).toBeGreaterThan(-1);
      expect(args.indexOf("--")).toBeLessThan(args.indexOf("https://example.com/r"));
    });

    it("should pass the abort signal through to execute", async () => {
      const ac = new AbortController();
      await cloneRepo({ directoryName: "x", abortController: ac });
      const [commandArg] = executeCalls[0]!;
      expect(commandArg[2].signal).toBe(ac.signal);
    });

    it("should omit the directory argument when directoryName is empty", async () => {
      await cloneRepo({});
      expect(mockExecute).toHaveBeenCalledTimes(1);
      const [commandArg] = executeCalls[0]!;
      expect(commandArg[1]).toEqual([
        "clone",
        "--depth",
        "1",
        "--",
        "https://github.com/damatjs/damat-starter-default",
      ]);
    });
  });

  describe("runCloneRepo", () => {
    const baseSpinner = () => ({ stop: mock(() => {}) }) as any;

    it("should clone, delete git dirs, then init a fresh git repo", async () => {
      const spinner = baseSpinner();
      await runCloneRepo({
        projectName: "proj",
        repoUrl: "",
        abortController: new AbortController(),
        spinner,
      });

      // 1 clone + 3 init commands (init, add, commit)
      expect(mockExecute).toHaveBeenCalledTimes(4);
      // rmSync called for .git and .github
      expect(mockRmSync).toHaveBeenCalledTimes(2);
      expect(mockRmSync.mock.calls[0]![0]).toBe(path.join("proj", ".git"));
      expect(mockRmSync.mock.calls[1]![0]).toBe(path.join("proj", ".github"));
      expect(spinner.stop).not.toHaveBeenCalled();
    });

    it("REGRESSION: should run every git init step inside the project directory (cwd)", async () => {
      // Without cwd, `git init && git add . && git commit` would run in the
      // user's CURRENT directory, silently committing over their working tree.
      await runCloneRepo({
        projectName: "proj",
        repoUrl: "",
        abortController: new AbortController(),
        spinner: baseSpinner(),
      });

      const gitSteps = executeCalls.filter(
        (c) => c[0][0] === "git" && c[0][1][0] !== "clone",
      );
      expect(gitSteps).toHaveLength(3);
      for (const [commandArg] of gitSteps) {
        expect(commandArg[2].cwd).toBe("proj");
      }
    });

    it("should fall back to execFileSync deletion when fs.rmSync throws", async () => {
      rmSyncImpl = () => {
        throw new Error("EPERM");
      };
      existsSyncImpl = () => true;
      const spinner = baseSpinner();
      await runCloneRepo({
        projectName: "proj",
        repoUrl: "",
        abortController: new AbortController(),
        spinner,
      });
      // both .git and .github deletions fall back to execFileSync
      expect(mockExecFileSync).toHaveBeenCalledTimes(2);
    });

    it("should NOT call execFileSync when the directory does not exist on fallback", async () => {
      rmSyncImpl = () => {
        throw new Error("EPERM");
      };
      existsSyncImpl = () => false;
      const spinner = baseSpinner();
      await runCloneRepo({
        projectName: "proj",
        repoUrl: "",
        abortController: new AbortController(),
        spinner,
      });
      expect(mockExecFileSync).not.toHaveBeenCalled();
    });

    it("should use cmd rmdir on win32 fallback", async () => {
      const origPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32" });
      try {
        rmSyncImpl = () => {
          throw new Error("EPERM");
        };
        existsSyncImpl = () => true;
        await runCloneRepo({
          projectName: "proj",
          repoUrl: "",
          abortController: new AbortController(),
          spinner: baseSpinner(),
        });
        expect(mockExecFileSync.mock.calls[0]![0]).toBe("cmd");
        expect(mockExecFileSync.mock.calls[0]![1]).toEqual([
          "/c",
          "rmdir",
          "/s",
          "/q",
          path.normalize(path.join("proj", ".git")),
        ]);
      } finally {
        Object.defineProperty(process, "platform", { value: origPlatform });
      }
    });

    it("should process.exit when the clone fails with an abort error", async () => {
      isAbortErrorImpl = () => true;
      executeImpl = async () => {
        throw new Error("aborted");
      };
      const spinner = baseSpinner();
      await runCloneRepo({
        projectName: "proj",
        repoUrl: "",
        abortController: new AbortController(),
        spinner,
      });
      expect(exitSpy).toHaveBeenCalled();
    });

    it("should stop spinner and log an error on a non-abort failure", async () => {
      isAbortErrorImpl = () => false;
      executeImpl = async (cmd: any) => {
        // fail only on the clone (first call), not the git-init calls
        if (cmd[0] === "git" && cmd[1][0] === "clone") {
          throw new Error("clone boom");
        }
        return { stdout: "", stderr: "" };
      };
      const spinner = baseSpinner();
      await runCloneRepo({
        projectName: "proj",
        repoUrl: "",
        abortController: new AbortController(),
        spinner,
      });
      expect(spinner.stop).toHaveBeenCalledTimes(1);
      expect(mockLogMessage).toHaveBeenCalledTimes(1);
      expect(mockLogMessage.mock.calls[0]![0]).toMatchObject({ type: "error" });
    });
  });

  describe("initializeFreshGit", () => {
    it("should run git init, add, and commit with defaults", async () => {
      await initializeFreshGit({ directory: "/scaffolded/proj" });
      const argvs = executeCalls.map((c) => c[0][1]);
      expect(argvs[0]).toEqual(["init", "-b", "main"]);
      expect(argvs[1]).toEqual(["add", "."]);
      expect(argvs[2]).toEqual([
        "commit",
        "-m",
        "chore: bootstrap project structure",
      ]);
    });

    it("REGRESSION: should pass the project directory as cwd to EVERY git step", async () => {
      await initializeFreshGit({ directory: "/scaffolded/proj" });
      expect(executeCalls).toHaveLength(3);
      for (const [commandArg] of executeCalls) {
        expect(commandArg[0]).toBe("git");
        expect(commandArg[2].cwd).toBe("/scaffolded/proj");
      }
    });

    it("should pass the commit message as ONE argv entry (quotes/spaces safe)", async () => {
      await initializeFreshGit({
        directory: "proj",
        initialMessage: 'has "quotes" and $(subshell)',
      });
      const commitArgs = executeCalls[2]![0][1];
      expect(commitArgs).toEqual([
        "commit",
        "-m",
        'has "quotes" and $(subshell)',
      ]);
    });

    it("should honor custom branchName and initialMessage", async () => {
      await initializeFreshGit({
        directory: "proj",
        branchName: "develop",
        initialMessage: "init!",
      });
      const argvs = executeCalls.map((c) => c[0][1]);
      expect(argvs[0]).toEqual(["init", "-b", "develop"]);
      expect(argvs[2]).toContain("init!");
    });

    it("should swallow errors from each git step (no verbose warning)", async () => {
      executeImpl = async () => {
        throw new Error("git failed");
      };
      const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
      try {
        await expect(
          initializeFreshGit({ directory: "proj" }),
        ).resolves.toBeUndefined();
        expect(warnSpy).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

    it("should warn for each failing step when verbose is true", async () => {
      executeImpl = async () => {
        throw new Error("git failed");
      };
      const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
      try {
        await initializeFreshGit({ directory: "proj", verbose: true });
        expect(warnSpy).toHaveBeenCalledTimes(3);
      } finally {
        warnSpy.mockRestore();
      }
    });
  });
});
