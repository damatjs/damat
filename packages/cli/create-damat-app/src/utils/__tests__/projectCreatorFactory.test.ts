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
import {
  ProjectCreatorFactory,
  damatProjectCreator,
  damatModuleCreator,
} from "../projectCreator";

// Capture genuine modules so we can restore them after this file completes
// (mock.module is global for the whole run; files run sequentially).
import * as realFsMod from "fs";
import * as realPromptsMod from "@clack/prompts";
import * as realLogMod from "../logger/message";
import * as realBunVersionMod from "../gets/bunVersion";
import * as realTerminalLinkMod from "terminal-link";

// Snapshot genuine values NOW (live namespaces would reflect the mocks later).
const REAL_FS = { ...realFsMod };
const REAL_PROMPTS = { ...realPromptsMod };
const REAL_LOG = { ...realLogMod };
const REAL_BUN_VERSION = { ...realBunVersionMod };
const REAL_TERMINAL_LINK = { ...realTerminalLinkMod };

// ---- Mock all external/side-effecting concerns. ----
// mock.module is global for the whole `bun test` run, so we (re)apply these in
// beforeAll to guarantee they're the active mocks while THIS file's tests run,
// regardless of other files. The SUT reads these via live bindings, so the
// re-mock takes effect before the tests execute.

// fs: control directory existence checks deterministically.
let existsSyncImpl: (p: string) => boolean = () => false;
let isDirectoryImpl: () => boolean = () => true;
const mockExistsSync = mock((p: string) => existsSyncImpl(p));
const mockLstatSync = mock((_p: string) => ({
  isDirectory: () => isDirectoryImpl(),
}));

// @clack/prompts: capture text() validate fn + return a scripted answer.
let textAnswer: any = "user-entered-name";
let lastTextOpts: any;
let isCancelImpl: (v: any) => boolean = () => false;
const mockText = mock(async (opts: any) => {
  lastTextOpts = opts;
  return textAnswer;
});
const mockCancel = mock(() => {});
const mockIsCancel = mock((v: any) => isCancelImpl(v));

// logger/message: capture log calls, never exit the process.
const mockLogMessage = mock((_o: any) => {});

// bunVersion: keep the version check passing by default.
let bunVersionImpl = () => 1;

function applyMocks() {
  mock.module("fs", () => ({
    ...REAL_FS,
    default: {
      ...(REAL_FS as any).default,
      existsSync: mockExistsSync,
      lstatSync: mockLstatSync,
    },
    existsSync: mockExistsSync,
    lstatSync: mockLstatSync,
  }));
  mock.module("@clack/prompts", () => ({
    text: mockText,
    cancel: mockCancel,
    isCancel: mockIsCancel,
    password: mock(async () => ""),
  }));
  mock.module("../logger/message", () => ({ default: mockLogMessage }));
  mock.module("../gets/bunVersion", () => ({
    getBunVersion: () => bunVersionImpl(),
    MIN_SUPPORTED_BUN_VERSION: 1,
  }));
  // terminal-link: avoid OSC escape sequences in test output.
  mock.module("terminal-link", () => ({
    default: (text: string) => text,
  }));
}

const getProjectName = (
  args: string[],
  directoryPath?: string,
  isModule?: boolean,
) => (ProjectCreatorFactory as any).getProjectName(args, directoryPath, isModule);

const validateNodeVersion = () =>
  (ProjectCreatorFactory as any).validateNodeVersion();

describe("ProjectCreatorFactory", () => {
  beforeAll(() => {
    applyMocks();
  });

  afterAll(() => {
    // restore genuine modules for subsequent test files
    mock.module("fs", () => ({ ...REAL_FS }));
    mock.module("@clack/prompts", () => ({ ...REAL_PROMPTS }));
    mock.module("../logger/message", () => ({ ...REAL_LOG }));
    mock.module("../gets/bunVersion", () => ({ ...REAL_BUN_VERSION }));
    mock.module("terminal-link", () => ({ ...REAL_TERMINAL_LINK }));
  });

  beforeEach(() => {
    existsSyncImpl = () => false;
    isDirectoryImpl = () => true;
    textAnswer = "user-entered-name";
    isCancelImpl = () => false;
    bunVersionImpl = () => 1;
    mockExistsSync.mockClear();
    mockLstatSync.mockClear();
    mockText.mockClear();
    mockCancel.mockClear();
    mockIsCancel.mockClear();
    mockLogMessage.mockClear();
    lastTextOpts = undefined;
  });

  afterEach(() => {
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  it("should be a static-only class with a private constructor", () => {
    // ProjectCreatorFactory exposes only static helpers; its private constructor
    // exists solely to prevent instantiation. Invoke it reflectively so the
    // (otherwise dead) constructor is exercised.
    const instance = new (ProjectCreatorFactory as any)();
    expect(instance).toBeInstanceOf(ProjectCreatorFactory);
  });

  describe("validateNodeVersion", () => {
    it("should NOT log an error when bun meets the minimum version", () => {
      bunVersionImpl = () => 1;
      validateNodeVersion();
      expect(mockLogMessage).not.toHaveBeenCalled();
    });

    it("should log an error when bun is below the minimum version", () => {
      bunVersionImpl = () => 0;
      validateNodeVersion();
      expect(mockLogMessage).toHaveBeenCalledTimes(1);
      expect(mockLogMessage.mock.calls[0]![0]).toMatchObject({ type: "error" });
    });
  });

  describe("getProjectName", () => {
    it("should return the provided name when it is valid and unused", async () => {
      existsSyncImpl = () => false;
      const name = await getProjectName(["my-app"], "/tmp");
      expect(name).toBe("my-app");
      expect(mockText).not.toHaveBeenCalled();
    });

    it("should prompt when no name argument is given", async () => {
      textAnswer = "prompted-name";
      const name = await getProjectName([], "/tmp");
      expect(mockText).toHaveBeenCalledTimes(1);
      expect(name).toBe("prompted-name");
    });

    it("should warn and prompt when the target directory already exists", async () => {
      existsSyncImpl = (p) => p === path.join("/tmp", "existing");
      isDirectoryImpl = () => true;
      textAnswer = "fresh-name";

      const name = await getProjectName(["existing"], "/tmp");

      expect(mockLogMessage).toHaveBeenCalledTimes(1);
      expect(mockLogMessage.mock.calls[0]![0]).toMatchObject({ type: "warn" });
      expect(mockText).toHaveBeenCalledTimes(1);
      expect(name).toBe("fresh-name");
    });

    it("should NOT warn when path exists but is not a directory", async () => {
      existsSyncImpl = () => true;
      isDirectoryImpl = () => false;

      const name = await getProjectName(["a-file"], "/tmp");

      expect(mockLogMessage).not.toHaveBeenCalled();
      expect(name).toBe("a-file");
    });

    it("should error and prompt when the name contains a dot", async () => {
      existsSyncImpl = () => false;
      textAnswer = "no-dot-name";

      const name = await getProjectName(["my.app"], "/tmp");

      expect(mockLogMessage).toHaveBeenCalledTimes(1);
      expect(mockLogMessage.mock.calls[0]![0]).toMatchObject({ type: "error" });
      expect(mockText).toHaveBeenCalledTimes(1);
      expect(name).toBe("no-dot-name");
    });

    it("should slugify and lowercase the prompted answer", async () => {
      textAnswer = "My New Project";
      const name = await getProjectName([], "/tmp");
      expect(name).toBe("my-new-project");
    });

    it("should use the module wording/default name when isModule is true", async () => {
      await getProjectName([], "/tmp", true);
      expect(lastTextOpts.message).toContain("module");
      expect(lastTextOpts.placeholder).toBe("damat-module");
    });

    it("should use the project wording/default name when isModule is false", async () => {
      await getProjectName([], "/tmp", false);
      expect(lastTextOpts.message).toContain("project");
      expect(lastTextOpts.placeholder).toBe("damat-backend");
    });

    describe("the prompt validate() callback", () => {
      it("should reject empty input", async () => {
        await getProjectName([], "/tmp");
        const validate = lastTextOpts.validate;
        expect(validate("   ")).toContain("Please enter");
      });

      it("should reject names that slugify to contain a dot", async () => {
        await getProjectName([], "/tmp");
        const validate = lastTextOpts.validate;
        const msg = validate("v1.2");
        expect(msg).toContain("dot");
      });

      it("should reject a name whose slug matches an existing directory", async () => {
        existsSyncImpl = (p) => p === path.join("/tmp", "taken");
        isDirectoryImpl = () => true;
        await getProjectName([], "/tmp");
        const validate = lastTextOpts.validate;
        expect(validate("Taken")).toContain("already exists");
      });

      it("should accept a valid, unused name (returns undefined)", async () => {
        existsSyncImpl = () => false;
        await getProjectName([], "/tmp");
        const validate = lastTextOpts.validate;
        expect(validate("good-name")).toBeUndefined();
      });
    });

    it("should cancel and exit(0) when the prompt is cancelled", async () => {
      isCancelImpl = () => true;
      const exitSpy = spyOn(process, "exit").mockImplementation(((_c?: number) =>
        undefined as never) as any);
      try {
        await getProjectName([], "/tmp");
        expect(mockCancel).toHaveBeenCalledWith("Operation cancelled");
        expect(exitSpy).toHaveBeenCalledWith(0);
      } finally {
        exitSpy.mockRestore();
      }
    });
  });

  describe("create", () => {
    it("should return a damatProjectCreator when module option is false", async () => {
      const creator = await ProjectCreatorFactory.create(["app"], {
        module: false,
        directoryPath: "/tmp",
      });
      expect(creator).toBeInstanceOf(damatProjectCreator);
    });

    it("should return a damatModuleCreator when module option is true", async () => {
      const creator = await ProjectCreatorFactory.create(["mod"], {
        module: true,
        directoryPath: "/tmp",
      });
      expect(creator).toBeInstanceOf(damatModuleCreator);
    });

    it("should validate the bun version before creating", async () => {
      bunVersionImpl = () => 0;
      await ProjectCreatorFactory.create(["app"], {
        module: false,
        directoryPath: "/tmp",
      });
      // validateNodeVersion logs an error when version is too low
      expect(
        mockLogMessage.mock.calls.some((c) => c[0]?.type === "error"),
      ).toBe(true);
    });
  });
});
