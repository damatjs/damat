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
import logMessage from "../logger/message";
import * as realLoggerIndexMod from "../logger/index";
const REAL_LOGGER_INDEX = { ...realLoggerIndexMod };

// Mock the winston logger so nothing is written to the real transport.
const mockInfo = mock((_m: string) => {});
const mockWarn = mock((_m: string) => {});

describe("logMessage", () => {
  let exitSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;

  beforeAll(() => {
    // mock.module is global; (re)apply in beforeAll so the logger mock is active
    // while this file's tests run. message.ts imports `{ logger } from "./index"`.
    mock.module("../logger/index", () => ({
      logger: { info: mockInfo, warn: mockWarn },
    }));
    mock.module("./index", () => ({
      logger: { info: mockInfo, warn: mockWarn },
    }));
  });

  afterAll(() => {
    mock.module("../logger/index", () => ({ ...REAL_LOGGER_INDEX }));
    mock.module("./index", () => ({ ...REAL_LOGGER_INDEX }));
  });

  beforeEach(() => {
    mockInfo.mockClear();
    mockWarn.mockClear();
    exitSpy = spyOn(process, "exit").mockImplementation(((_c?: number) => {
      // prevent the test runner from actually exiting
      return undefined as never;
    }) as any);
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("should default to info level and route to logger.info", () => {
    logMessage({ message: "hello" });
    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(mockInfo.mock.calls[0]![0]).toContain("hello");
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("should route success messages to logger.info", () => {
    logMessage({ message: "yay", type: "success" });
    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(mockInfo.mock.calls[0]![0]).toContain("yay");
  });

  it("should route warn messages to logger.warn", () => {
    logMessage({ message: "careful", type: "warn" });
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn.mock.calls[0]![0]).toContain("careful");
    expect(mockInfo).not.toHaveBeenCalled();
  });

  it("should route verbose messages to logger.info with a VERBOSE LOG prefix", () => {
    logMessage({ message: "details", type: "verbose" });
    expect(mockInfo).toHaveBeenCalledTimes(1);
    expect(mockInfo.mock.calls[0]![0]).toContain("VERBOSE LOG:");
    expect(mockInfo.mock.calls[0]![0]).toContain("details");
  });

  it("should print errors to console.error and exit with code 1", () => {
    logMessage({ message: "broke", type: "error" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]![0]).toContain("broke");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockInfo).not.toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it("should append the stack to error output when provided", () => {
    logMessage({ message: "broke", type: "error", stack: "STACKTRACE" });
    expect(errorSpy.mock.calls[0]![0]).toContain("STACKTRACE");
  });

  it("should trim the error message before printing", () => {
    logMessage({ message: "   spaced   ", type: "error" });
    const printed = errorSpy.mock.calls[0]![0] as string;
    // the trimmed message should not contain the leading/trailing run of spaces
    expect(printed).toContain("spaced");
    expect(printed).not.toContain("   spaced   ");
  });
});
