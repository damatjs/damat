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
import { runScaffoldModule } from "../actions/scaffoldModule";

import * as realExecutorMod from "../commands/executor";
import * as realLogMod from "../logger/message";
import * as realAbortMod from "../commands/createAbortController";

const REAL_EXECUTE = realExecutorMod.default;
const REAL_LOG = realLogMod.default;
const REAL_ABORT = { ...realAbortMod };

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
let isAbortErrorImpl: (e: any) => boolean = () => false;

describe("runScaffoldModule", () => {
  let exitSpy: ReturnType<typeof spyOn>;

  beforeAll(() => {
    mock.module("../commands/executor", () => ({ default: mockExecute }));
    mock.module("../logger/message", () => ({ default: mockLogMessage }));
    mock.module("../commands/createAbortController", () => ({
      ...REAL_ABORT,
      isAbortError: (e: any) => isAbortErrorImpl(e),
    }));
  });

  afterAll(() => {
    mock.module("../commands/executor", () => ({ default: REAL_EXECUTE }));
    mock.module("../logger/message", () => ({ default: REAL_LOG }));
    mock.module("../commands/createAbortController", () => ({ ...REAL_ABORT }));
  });

  beforeEach(() => {
    executeCalls.length = 0;
    executeImpl = async () => ({ stdout: "", stderr: "" });
    isAbortErrorImpl = () => false;
    mockExecute.mockClear();
    mockLogMessage.mockClear();
    exitSpy = spyOn(process, "exit").mockImplementation(((_c?: number) =>
      undefined as never) as any);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  const baseSpinner = () => ({ stop: mock(() => {}) }) as any;

  it("should run `bunx @damatjs/damat-cli module init` (argv form) with the pinned version and cwd", async () => {
    const ac = new AbortController();
    await runScaffoldModule({
      name: "my-mod",
      directoryPath: "/work/dir",
      version: "1.2.3",
      abortController: ac,
      spinner: baseSpinner(),
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [commandArg] = executeCalls[0]!;
    expect(commandArg[0]).toBe("bunx");
    expect(commandArg[1]).toEqual([
      "@damatjs/damat-cli@1.2.3",
      "module",
      "init",
      "my-mod",
    ]);
    expect(commandArg[2].cwd).toBe("/work/dir");
    expect(commandArg[2].signal).toBe(ac.signal);
  });

  it("should default the version to `latest` when empty", async () => {
    await runScaffoldModule({
      name: "m",
      directoryPath: "/d",
      version: "",
      abortController: new AbortController(),
      spinner: baseSpinner(),
    });
    const [commandArg] = executeCalls[0]!;
    expect(commandArg[1]).toContain("@damatjs/damat-cli@latest");
  });

  it("should fall back to process.cwd() when directoryPath is empty", async () => {
    await runScaffoldModule({
      name: "m",
      directoryPath: "",
      abortController: new AbortController(),
      spinner: baseSpinner(),
    });
    const [commandArg] = executeCalls[0]!;
    expect(commandArg[2].cwd).toBe(process.cwd());
  });

  it("should process.exit on an abort error", async () => {
    isAbortErrorImpl = () => true;
    executeImpl = async () => {
      throw new Error("aborted");
    };
    await runScaffoldModule({
      name: "m",
      directoryPath: "/d",
      abortController: new AbortController(),
      spinner: baseSpinner(),
    });
    expect(exitSpy).toHaveBeenCalled();
  });

  it("should stop the spinner and log an error on a non-abort failure", async () => {
    isAbortErrorImpl = () => false;
    executeImpl = async () => {
      throw new Error("scaffold boom");
    };
    const spinner = baseSpinner();
    await runScaffoldModule({
      name: "m",
      directoryPath: "/d",
      abortController: new AbortController(),
      spinner,
    });
    expect(spinner.stop).toHaveBeenCalledTimes(1);
    expect(mockLogMessage).toHaveBeenCalledTimes(1);
    expect(mockLogMessage.mock.calls[0]![0]).toMatchObject({ type: "error" });
  });
});
