import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  mock,
} from "bun:test";
import path from "path";
import PackageManager from "../package/manager";
import ProcessManager from "../commands/manager";

// Capture the REAL modules at load time so we can restore them after this file
// finishes. Bun's mock.module is global for the entire `bun test` run and files
// run sequentially, so we (a) apply our mocks in beforeAll, (b) restore the
// genuine modules in afterAll. This prevents our mocks from leaking into other
// files (e.g. executor.test.ts depends on the real ../commands/executor).
import * as realExecutorMod from "../commands/executor";
import * as realLogMod from "../logger/message";
import * as realFsMod from "fs";

// Snapshot the genuine values NOW (before any mock is applied). A live `import *`
// namespace would reflect the mocked values once we mock, so we must copy.
const REAL_EXECUTE = realExecutorMod.default;
const REAL_LOG = realLogMod.default;
const REAL_FS = { ...realFsMod };

// execute() (../commands/executor) wraps child_process; mock it so no real
// process is ever spawned.
const mockExecute = mock(
  (): Promise<{ stdout?: string; stderr?: string }> =>
    Promise.resolve({ stdout: "", stderr: "" }),
);

// logMessage (../logger/message) calls process.exit on errors; mock it.
const mockLogMessage = mock(() => {});

// fs is used by removeLockFiles; mock existsSync/rmSync so nothing touches disk.
const mockExistsSync = mock((_p: string): boolean => false);
const mockRmSync = mock((_p: string, _o?: unknown) => {});

describe("PackageManager", () => {
  let processManager: ProcessManager;

  beforeAll(() => {
    mock.module("../commands/executor", () => ({ default: mockExecute }));
    mock.module("../logger/message", () => ({ default: mockLogMessage }));
    mock.module("fs", () => ({
      ...REAL_FS,
      existsSync: mockExistsSync,
      rmSync: mockRmSync,
    }));
  });

  afterAll(() => {
    // restore genuine modules for subsequent test files
    mock.module("../commands/executor", () => ({ default: REAL_EXECUTE }));
    mock.module("../logger/message", () => ({ default: REAL_LOG }));
    mock.module("fs", () => ({ ...REAL_FS }));
  });

  beforeEach(() => {
    processManager = new ProcessManager();
    mockExecute.mockClear();
    mockExistsSync.mockClear();
    mockRmSync.mockClear();
    mockLogMessage.mockClear();
    // default implementations
    mockExecute.mockImplementation(() =>
      Promise.resolve({ stdout: "", stderr: "" }),
    );
    mockExistsSync.mockImplementation(() => false);
  });

  afterEach(() => {
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  describe("constructor", () => {
    it("should default verbose to false when no options are passed", () => {
      const pm = new PackageManager(processManager);
      expect((pm as any).verbose).toBe(false);
    });

    it("should default verbose to false for an empty options object", () => {
      const pm = new PackageManager(processManager, {});
      expect((pm as any).verbose).toBe(false);
    });

    it("should respect verbose: true", () => {
      const pm = new PackageManager(processManager, { verbose: true });
      expect((pm as any).verbose).toBe(true);
    });

    it("should store the provided process manager", () => {
      const pm = new PackageManager(processManager);
      expect((pm as any).processManager).toBe(processManager);
    });

    it("should not have a version before detection", () => {
      const pm = new PackageManager(processManager);
      expect((pm as any).packageManagerVersion).toBeUndefined();
    });
  });

  describe("getCommandStr", () => {
    it("should always produce a `bun run <command>` string", () => {
      const pm = new PackageManager(processManager);
      expect(pm.getCommandStr("dev")).toBe("bun run dev");
    });

    it("should work for arbitrary script names", () => {
      const pm = new PackageManager(processManager);
      expect(pm.getCommandStr("build")).toBe("bun run build");
      expect(pm.getCommandStr("test")).toBe("bun run test");
    });

    it("should pass through script names containing spaces/flags", () => {
      const pm = new PackageManager(processManager);
      expect(pm.getCommandStr("db:migrate --force")).toBe(
        "bun run db:migrate --force",
      );
    });
  });

  describe("getCommandArgs", () => {
    it("should return an argv tuple for shell-free spawning", () => {
      const pm = new PackageManager(processManager);
      expect(pm.getCommandArgs("dev")).toEqual(["bun", ["run", "dev"]]);
    });
  });

  describe("getPackageManagerString", () => {
    it("should return undefined when no version is detected", async () => {
      const pm = new PackageManager(processManager);
      expect(await pm.getPackageManagerString()).toBeUndefined();
    });

    it("should return `bun@<version>` once a version is set", async () => {
      const pm = new PackageManager(processManager);
      (pm as any).packageManagerVersion = "1.3.11";
      expect(await pm.getPackageManagerString()).toBe("bun@1.3.11");
    });

    it("should not call logMessage when verbose is false and no version", async () => {
      const pm = new PackageManager(processManager);
      await pm.getPackageManagerString();
      expect(mockLogMessage).not.toHaveBeenCalled();
    });

    it("should log an info message when verbose and no version", async () => {
      const pm = new PackageManager(processManager, { verbose: true });
      await pm.getPackageManagerString();
      expect(mockLogMessage).toHaveBeenCalledTimes(1);
      expect(mockLogMessage.mock.calls[0]![0]).toMatchObject({ type: "info" });
    });

    it("should log an info message when verbose and a version exists", async () => {
      const pm = new PackageManager(processManager, { verbose: true });
      (pm as any).packageManagerVersion = "1.0.0";
      const result = await pm.getPackageManagerString();
      expect(result).toBe("bun@1.0.0");
      expect(mockLogMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe("removeLockFiles", () => {
    it("should not remove anything when no lock files exist", async () => {
      mockExistsSync.mockImplementation(() => false);
      const pm = new PackageManager(processManager);
      await pm.removeLockFiles("/tmp/project");
      expect(mockRmSync).not.toHaveBeenCalled();
    });

    it("should check each known lock file under the given directory", async () => {
      mockExistsSync.mockImplementation(() => false);
      const pm = new PackageManager(processManager);
      await pm.removeLockFiles("/tmp/project");

      const checked = mockExistsSync.mock.calls.map((c) => c[0]);
      expect(checked).toEqual([
        path.join("/tmp/project", "bun.lock"),
        path.join("/tmp/project", "package-lock.json"),
        path.join("/tmp/project", "pnpm-lock.yaml"),
        path.join("/tmp/project", ".bun"),
      ]);
    });

    it("should remove a lock file (recursive+force) when it exists", async () => {
      mockExistsSync.mockImplementation(
        (p: string) => p === path.join("/tmp/project", "package-lock.json"),
      );
      const pm = new PackageManager(processManager);
      await pm.removeLockFiles("/tmp/project");

      expect(mockRmSync).toHaveBeenCalledTimes(1);
      expect(mockRmSync.mock.calls[0]![0]).toBe(
        path.join("/tmp/project", "package-lock.json"),
      );
      expect(mockRmSync.mock.calls[0]![1]).toEqual({
        force: true,
        recursive: true,
      });
    });

    it("should remove every existing lock file", async () => {
      mockExistsSync.mockImplementation(() => true);
      const pm = new PackageManager(processManager);
      await pm.removeLockFiles("/tmp/project");
      expect(mockRmSync).toHaveBeenCalledTimes(4);
    });
  });

  describe("installDependencies", () => {
    it("should remove lock files when a string cwd is provided", async () => {
      mockExistsSync.mockImplementation(() => false);
      const pm = new PackageManager(processManager);
      await pm.installDependencies({ cwd: "/tmp/project" });
      // existsSync is the proxy for removeLockFiles having run
      expect(mockExistsSync).toHaveBeenCalled();
    });

    it("should skip lock-file removal when cwd is not a string", async () => {
      const pm = new PackageManager(processManager);
      await pm.installDependencies({});
      expect(mockExistsSync).not.toHaveBeenCalled();
    });

    it("should execute `bun install` (argv form) with the provided exec options", async () => {
      const pm = new PackageManager(processManager);
      const opts = { cwd: "/tmp/project" };
      await pm.installDependencies(opts);

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const [commandArg, verboseArg] = mockExecute.mock.calls[0]!;
      expect(commandArg).toEqual(["bun", ["install"], opts]);
      expect(verboseArg).toEqual({ verbose: false });
    });

    it("should forward verbose: true into the execute call", async () => {
      const pm = new PackageManager(processManager, { verbose: true });
      await pm.installDependencies({});
      expect(mockExecute.mock.calls[0]![1]).toEqual({ verbose: true });
    });
  });

  describe("runCommand", () => {
    it("should run the command argv via execute", async () => {
      const pm = new PackageManager(processManager);
      await pm.runCommand(["dev"], { cwd: "/x" });

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const [commandArg] = mockExecute.mock.calls[0]!;
      expect(commandArg).toEqual(["bun", ["run", "dev"], { cwd: "/x" }]);
    });

    it("should keep flags as separate literal argv entries", async () => {
      const pm = new PackageManager(processManager);
      await pm.runCommand(["db:migrate", "--force"], {});
      const [commandArg] = mockExecute.mock.calls[0]!;
      expect(commandArg[1]).toEqual(["run", "db:migrate", "--force"]);
    });

    it("should merge verboseOptions over the instance verbose flag", async () => {
      const pm = new PackageManager(processManager, { verbose: false });
      await pm.runCommand(["build"], {}, { needOutput: true });
      expect(mockExecute.mock.calls[0]![1]).toEqual({
        verbose: false,
        needOutput: true,
      });
    });

    it("should return the result produced by execute", async () => {
      mockExecute.mockImplementation(() =>
        Promise.resolve({ stdout: "done", stderr: "" }),
      );
      const pm = new PackageManager(processManager);
      const result = await pm.runCommand(["dev"], {});
      expect(result).toEqual({ stdout: "done", stderr: "" });
    });
  });

  describe("rundamatCommand", () => {
    it("should prefix the argv with `run damat`", async () => {
      const pm = new PackageManager(processManager);
      await pm.rundamatCommand(["db:create"], { cwd: "/x" });

      const [commandArg] = mockExecute.mock.calls[0]!;
      expect(commandArg).toEqual([
        "bun",
        ["run", "damat", "db:create"],
        { cwd: "/x" },
      ]);
    });

    it("should merge verbose options", async () => {
      const pm = new PackageManager(processManager, { verbose: true });
      await pm.rundamatCommand(["seed"], {}, { needOutput: true });
      expect(mockExecute.mock.calls[0]![1]).toEqual({
        verbose: true,
        needOutput: true,
      });
    });
  });

  describe("setPackageManager", () => {
    it("should store the detected bun version on success", async () => {
      mockExecute.mockImplementation(() =>
        Promise.resolve({ stdout: "1.3.11\n", stderr: "" }),
      );
      const pm = new PackageManager(processManager);
      await pm.setPackageManager({});
      expect((pm as any).packageManagerVersion).toBe("1.3.11");
    });

    it("should not overwrite an already known version", async () => {
      mockExecute.mockImplementation(() =>
        Promise.resolve({ stdout: "9.9.9\n", stderr: "" }),
      );
      const pm = new PackageManager(processManager);
      (pm as any).packageManagerVersion = "1.0.0";
      await pm.setPackageManager({});
      expect((pm as any).packageManagerVersion).toBe("1.0.0");
    });

    it("should log an error when bun version cannot be determined", async () => {
      // execute rejects -> getVersion returns undefined -> error logged
      mockExecute.mockImplementation(() =>
        Promise.reject(new Error("command not found")),
      );
      const pm = new PackageManager(processManager);
      await pm.setPackageManager({});
      expect(mockLogMessage).toHaveBeenCalledTimes(1);
      expect(mockLogMessage.mock.calls[0]![0]).toMatchObject({ type: "error" });
    });
  });
});
