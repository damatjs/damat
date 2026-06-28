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
import { damatModuleCreator } from "../projectCreator/damatModuleCreator";

import * as realCloneMod from "../actions/cloneRepo";
import * as realScaffoldMod from "../actions/scaffoldModule";
import * as realPrepareMod from "../actions/prepareProject";
import * as realFactsMod from "../commands/facts";
import * as realLogMod from "../logger/message";
import * as realAbortMod from "../commands/createAbortController";
import * as realTerminalLinkMod from "terminal-link";

const REAL_CLONE = { ...realCloneMod };
const REAL_SCAFFOLD = { ...realScaffoldMod };
const REAL_PREPARE = { ...realPrepareMod };
const REAL_FACTS = { ...realFactsMod };
const REAL_LOG = { ...realLogMod };
const REAL_ABORT = { ...realAbortMod };
const REAL_TERMINAL_LINK = { ...realTerminalLinkMod };

const mockRunCloneRepo = mock(async (_o: any) => {});
const mockRunScaffoldModule = mock(async (_o: any) => {});
let prepareImpl: (o: any) => Promise<any> = async () => undefined;
const mockPrepare = mock((o: any) => prepareImpl(o));
const mockDisplayFactBox = mock((_o: any) => 1 as any);
const mockLogMessage = mock((_o: any) => {});
let isAbortErrorImpl: (e: any) => boolean = () => false;

function applyMocks() {
  mock.module("../actions/cloneRepo", () => ({
    ...REAL_CLONE,
    runCloneRepo: mockRunCloneRepo,
  }));
  mock.module("../actions/scaffoldModule", () => ({
    ...REAL_SCAFFOLD,
    runScaffoldModule: mockRunScaffoldModule,
  }));
  mock.module("../actions/prepareProject", () => ({ default: mockPrepare }));
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
  module: true,
  directoryPath: "/base",
  verbose: false,
  ...extra,
});

describe("damatModuleCreator", () => {
  let exitSpy: ReturnType<typeof spyOn>;

  beforeAll(() => {
    applyMocks();
  });

  afterAll(() => {
    mock.module("../actions/cloneRepo", () => ({ ...REAL_CLONE }));
    mock.module("../actions/scaffoldModule", () => ({ ...REAL_SCAFFOLD }));
    mock.module("../actions/prepareProject", () => ({ ...REAL_PREPARE }));
    mock.module("../commands/facts", () => ({ ...REAL_FACTS }));
    mock.module("../logger/message", () => ({ ...REAL_LOG }));
    mock.module("../commands/createAbortController", () => ({ ...REAL_ABORT }));
    mock.module("terminal-link", () => ({ ...REAL_TERMINAL_LINK }));
  });

  beforeEach(() => {
    prepareImpl = async () => undefined;
    isAbortErrorImpl = () => false;
    mockRunCloneRepo.mockClear();
    mockRunScaffoldModule.mockClear();
    mockPrepare.mockClear();
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
    const creator = new damatModuleCreator("my-mod", opts, ["my-mod"]);
    const spinner = (creator as any).spinner;
    spyOn(spinner, "start").mockImplementation(() => spinner);
    spyOn(spinner, "stop").mockImplementation(() => spinner);
    spyOn(spinner, "success").mockImplementation(() => spinner);
    return creator;
  }

  it("should scaffold locally (no repoUrl) then prepare the module", async () => {
    const creator = makeCreator();
    await creator.create();

    expect(mockRunScaffoldModule).toHaveBeenCalledTimes(1);
    expect(mockRunCloneRepo).not.toHaveBeenCalled();
    expect(mockPrepare).toHaveBeenCalledTimes(1);
    expect(mockPrepare.mock.calls[0]![0].isModule).toBe(true);
    expect(mockRunScaffoldModule.mock.calls[0]![0].name).toBe("my-mod");
    expect(mockRunScaffoldModule.mock.calls[0]![0].version).toBe("latest");
  });

  it("should clone a custom starter when repoUrl is set (and not scaffold)", async () => {
    const creator = makeCreator(options({ repoUrl: "https://x/custom" }));
    await creator.create();

    expect(mockRunCloneRepo).toHaveBeenCalledTimes(1);
    expect(mockRunCloneRepo.mock.calls[0]![0].isModule).toBe(true);
    expect(mockRunCloneRepo.mock.calls[0]![0].repoUrl).toBe("https://x/custom");
    expect(mockRunScaffoldModule).not.toHaveBeenCalled();
  });

  it("should forward version/verbose/directoryPath into scaffold", async () => {
    const creator = makeCreator(
      options({ version: "9.9.9", verbose: true, directoryPath: "/dir" }),
    );
    await creator.create();
    const arg = mockRunScaffoldModule.mock.calls[0]![0];
    expect(arg.version).toBe("9.9.9");
    expect(arg.verbose).toBe(true);
    expect(arg.directoryPath).toBe("/dir");
  });

  it("should process.exit on an abort error during create", async () => {
    isAbortErrorImpl = () => true;
    prepareImpl = async () => {
      throw new Error("aborted");
    };
    const creator = makeCreator();
    await creator.create();
    expect(exitSpy).toHaveBeenCalled();
  });

  it("should log an error (no stack) on a non-bun, non-abort failure", async () => {
    prepareImpl = async () => {
      throw new Error("generic");
    };
    const creator = makeCreator();
    await creator.create();
    const errCall = mockLogMessage.mock.calls.find((c) => c[0]?.type === "error");
    expect(errCall).toBeDefined();
    expect(errCall![0].stack).toBe("");
  });

  it("should include the stack when the error message mentions bun", async () => {
    prepareImpl = async () => {
      const e = new Error("bun broke");
      e.stack = "MODSTACK";
      throw e;
    };
    const creator = makeCreator();
    await creator.create();
    const errCall = mockLogMessage.mock.calls.find((c) => c[0]?.type === "error");
    expect(errCall![0].stack).toBe("MODSTACK");
  });

  it("should print the module success box and call success on completion", async () => {
    const creator = makeCreator();
    await creator.create();
    const printed = mockLogMessage.mock.calls.map((c) => c[0]?.message).join("\n");
    expect(printed).toContain("my-mod");
    expect(printed).toContain("damat Module");
  });

  describe("setupProcessManager (SIGINT terminated handler)", () => {
    it("should print success once when the module was created", async () => {
      const creator = makeCreator();
      await creator.create();
      // create() already marks isProjectCreated? It does NOT for module creator,
      // so set it explicitly to exercise the printedMessage branch.
      (creator as any).isProjectCreated = true;
      (creator as any).printedMessage = false;
      mockLogMessage.mockClear();

      process.emit("SIGINT");
      await new Promise((r) => setTimeout(r, 0));

      expect((creator as any).printedMessage).toBe(true);
      const printed = mockLogMessage.mock.calls.map((c) => c[0]?.message).join("\n");
      expect(printed).toContain("my-mod");
    });

    it("should not print when the module was not created", async () => {
      makeCreator();
      mockLogMessage.mockClear();
      process.emit("SIGINT");
      await new Promise((r) => setTimeout(r, 0));
      expect(mockLogMessage).not.toHaveBeenCalled();
    });
  });
});
