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
import { damatProjectCreator } from "../projectCreator/damatProjectCreator";

import * as realCloneMod from "../actions/cloneRepo";
import * as realPrepareMod from "../actions/prepareProject";
import * as realStartMod from "../commands/startDamat";
import * as realFactsMod from "../commands/facts";
import * as realLogMod from "../logger/message";
import * as realAbortMod from "../commands/createAbortController";
import * as realTerminalLinkMod from "terminal-link";

const REAL_CLONE = { ...realCloneMod };
const REAL_PREPARE = { ...realPrepareMod };
const REAL_START = { ...realStartMod };
const REAL_FACTS = { ...realFactsMod };
const REAL_LOG = { ...realLogMod };
const REAL_ABORT = { ...realAbortMod };
const REAL_TERMINAL_LINK = { ...realTerminalLinkMod };

const mockRunCloneRepo = mock(async (_o: any) => {});
let prepareImpl: (o: any) => Promise<any> = async () => undefined;
const mockPrepare = mock((o: any) => prepareImpl(o));
const mockStartDamat = mock((_o: any) => {});
const mockDisplayFactBox = mock((_o: any) => 1 as any);
const mockLogMessage = mock((_o: any) => {});
let isAbortErrorImpl: (e: any) => boolean = () => false;

function applyMocks() {
  mock.module("../actions/cloneRepo", () => ({
    ...REAL_CLONE,
    runCloneRepo: mockRunCloneRepo,
  }));
  mock.module("../actions/prepareProject", () => ({ default: mockPrepare }));
  mock.module("../commands/startDamat", () => ({ default: mockStartDamat }));
  mock.module("../commands/facts", () => ({
    ...REAL_FACTS,
    displayFactBox: mockDisplayFactBox,
  }));
  mock.module("../logger/message", () => ({ default: mockLogMessage }));
  mock.module("../commands/createAbortController", () => ({
    ...REAL_ABORT,
    isAbortError: (e: any) => isAbortErrorImpl(e),
  }));
  mock.module("terminal-link", () => ({ default: (t: string) => t }));
}

const options = (extra: any = {}) => ({
  module: false,
  directoryPath: "/base",
  verbose: false,
  ...extra,
});

describe("damatProjectCreator", () => {
  let exitSpy: ReturnType<typeof spyOn>;

  beforeAll(() => {
    applyMocks();
  });

  afterAll(() => {
    mock.module("../actions/cloneRepo", () => ({ ...REAL_CLONE }));
    mock.module("../actions/prepareProject", () => ({ ...REAL_PREPARE }));
    mock.module("../commands/startDamat", () => ({ ...REAL_START }));
    mock.module("../commands/facts", () => ({ ...REAL_FACTS }));
    mock.module("../logger/message", () => ({ ...REAL_LOG }));
    mock.module("../commands/createAbortController", () => ({ ...REAL_ABORT }));
    mock.module("terminal-link", () => ({ ...REAL_TERMINAL_LINK }));
  });

  beforeEach(() => {
    prepareImpl = async () => undefined;
    isAbortErrorImpl = () => false;
    mockRunCloneRepo.mockClear();
    mockPrepare.mockClear();
    mockStartDamat.mockClear();
    mockDisplayFactBox.mockClear();
    mockLogMessage.mockClear();
    exitSpy = spyOn(process, "exit").mockImplementation(((_c?: number) =>
      undefined as never) as any);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  function makeCreator(opts: any = options()) {
    const creator = new damatProjectCreator("my-app", opts, ["my-app"]);
    // silence the real spinner so nothing renders to the terminal
    const spinner = (creator as any).spinner;
    spyOn(spinner, "start").mockImplementation(() => spinner);
    spyOn(spinner, "stop").mockImplementation(() => spinner);
    spyOn(spinner, "success").mockImplementation(() => spinner);
    return creator;
  }

  it("should clone, prepare, then start services on a successful create", async () => {
    const creator = makeCreator();
    await creator.create();

    expect(mockRunCloneRepo).toHaveBeenCalledTimes(1);
    expect(mockRunCloneRepo.mock.calls[0]![0].isModule).toBe(false);
    expect(mockPrepare).toHaveBeenCalledTimes(1);
    expect(mockPrepare.mock.calls[0]![0].isModule).toBe(false);
    expect(mockStartDamat).toHaveBeenCalledTimes(1);
    expect((creator as any).isProjectCreated).toBe(true);
  });

  it("should default repoUrl/version when not provided", async () => {
    const creator = makeCreator(options({ repoUrl: undefined, version: undefined }));
    await creator.create();
    expect(mockRunCloneRepo.mock.calls[0]![0].repoUrl).toBe("");
    expect(mockPrepare.mock.calls[0]![0].version).toBe("latest");
  });

  it("should pass an explicit repoUrl/version/verbose through", async () => {
    const creator = makeCreator(
      options({ repoUrl: "https://x/y", version: "3.1.0", verbose: true }),
    );
    await creator.create();
    expect(mockRunCloneRepo.mock.calls[0]![0].repoUrl).toBe("https://x/y");
    expect(mockRunCloneRepo.mock.calls[0]![0].verbose).toBe(true);
    expect(mockPrepare.mock.calls[0]![0].version).toBe("3.1.0");
  });

  it("should process.exit when an abort error occurs during create", async () => {
    isAbortErrorImpl = () => true;
    prepareImpl = async () => {
      throw new Error("aborted");
    };
    const creator = makeCreator();
    await creator.create();
    expect(exitSpy).toHaveBeenCalled();
    expect(mockStartDamat).not.toHaveBeenCalled();
  });

  it("should log an error (no stack) on a non-bun, non-abort failure", async () => {
    isAbortErrorImpl = () => false;
    prepareImpl = async () => {
      throw new Error("generic failure");
    };
    const creator = makeCreator();
    await creator.create();
    expect(mockLogMessage).toHaveBeenCalled();
    const errCall = mockLogMessage.mock.calls.find((c) => c[0]?.type === "error");
    expect(errCall).toBeDefined();
    expect(errCall![0].stack).toBe("");
  });

  it("should include the stack when the error message mentions bun", async () => {
    isAbortErrorImpl = () => false;
    prepareImpl = async () => {
      const e = new Error("bun blew up");
      e.stack = "STACKHERE";
      throw e;
    };
    const creator = makeCreator();
    await creator.create();
    const errCall = mockLogMessage.mock.calls.find((c) => c[0]?.type === "error");
    expect(errCall![0].stack).toBe("STACKHERE");
  });

  describe("showSuccessMessage / setupProcessManager", () => {
    it("should print the success box including the dev command via SIGINT after creation", async () => {
      const creator = makeCreator();
      await creator.create();
      mockLogMessage.mockClear();

      process.emit("SIGINT");
      await new Promise((r) => setTimeout(r, 0));

      // the terminated handler should print the success message once
      const printed = mockLogMessage.mock.calls.map((c) => c[0]?.message).join("\n");
      expect(printed).toContain("my-app");
      expect(printed).toContain("bun run dev");
      expect((creator as any).printedMessage).toBe(true);
    });

    it("should not print the success message twice on repeated signals", async () => {
      const creator = makeCreator();
      await creator.create();
      mockLogMessage.mockClear();

      process.emit("SIGINT");
      await new Promise((r) => setTimeout(r, 0));
      const afterFirst = mockLogMessage.mock.calls.length;
      process.emit("SIGINT");
      await new Promise((r) => setTimeout(r, 0));
      expect(mockLogMessage.mock.calls.length).toBe(afterFirst);
    });

    it("should not print a success message when the project was never created", async () => {
      makeCreator(); // constructed but create() not called
      mockLogMessage.mockClear();
      process.emit("SIGINT");
      await new Promise((r) => setTimeout(r, 0));
      expect(mockLogMessage).not.toHaveBeenCalled();
    });
  });
});
