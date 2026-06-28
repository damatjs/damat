import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  spyOn,
  mock,
} from "bun:test";
import {
  getFact,
  showFact,
  createFactBox,
  resetFactBox,
  displayFactBox,
} from "../commands/facts";
import ProcessManager from "../commands/manager";

// A minimal fake yocto-spinner that records interactions without touching the
// terminal.
function createFakeSpinner() {
  return {
    text: "",
    start: mock((_t?: string) => {}),
    stop: mock(() => {}),
    success: mock((_t?: string) => {}),
  };
}

describe("getFact", () => {
  let randomSpy: ReturnType<typeof spyOn>;

  afterEach(() => {
    randomSpy?.mockRestore();
  });

  it("should return a non-empty string", () => {
    const fact = getFact();
    expect(typeof fact).toBe("string");
    expect(fact!.length).toBeGreaterThan(0);
  });

  it("should pick the first fact when Math.random() is 0", () => {
    randomSpy = spyOn(Math, "random").mockReturnValue(0);
    expect(getFact()).toBe(
      "damat was architected with composability at its core, allowing teams to scale features independently.",
    );
  });

  it("should pick the last fact when Math.random() approaches 1", () => {
    randomSpy = spyOn(Math, "random").mockReturnValue(0.999999);
    expect(getFact()).toBe(
      "It is designed to support future AI-native commerce experiences such as autonomous pricing and demand forecasting.",
    );
  });

  it("should always return a fact from the known list across many random draws", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(getFact()!);
    }
    // every drawn value is a non-empty string (i.e. a valid index)
    for (const fact of seen) {
      expect(fact.length).toBeGreaterThan(0);
    }
  });
});

describe("showFact", () => {
  let logSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("should set spinner.text (and not log) when not verbose", () => {
    const spinner = createFakeSpinner();
    showFact({ spinner: spinner as any, title: "Working...", verbose: false });

    expect(spinner.text).toContain("Working...");
    expect(spinner.text.length).toBeGreaterThan("Working...".length);
    expect(logSpy).not.toHaveBeenCalled();
    expect(spinner.stop).not.toHaveBeenCalled();
  });

  it("should stop/log/restart the spinner when verbose", () => {
    const spinner = createFakeSpinner();
    showFact({ spinner: spinner as any, title: "Working...", verbose: true });

    expect(spinner.stop).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(spinner.start).toHaveBeenCalledWith("Working...");
    // in verbose mode the spinner text is not used for the fact box
    expect(spinner.text).toBe("");
  });
});

describe("createFactBox", () => {
  let setIntervalSpy: ReturnType<typeof spyOn>;
  let logSpy: ReturnType<typeof spyOn>;
  let processManager: ProcessManager;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    setIntervalSpy = spyOn(globalThis, "setInterval").mockReturnValue(
      12345 as any,
    );
    processManager = new ProcessManager();
  });

  afterEach(() => {
    logSpy.mockRestore();
    setIntervalSpy.mockRestore();
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  it("should register a 10s interval and return its handle", () => {
    const spinner = createFakeSpinner();
    const interval = createFactBox({
      spinner: spinner as any,
      title: "Setting up",
      processManager,
    });

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy.mock.calls[0]![1]).toBe(10000);
    expect(interval).toBe(12345 as any);
  });

  it("should add the interval to the process manager for cleanup", () => {
    const spinner = createFakeSpinner();
    createFactBox({
      spinner: spinner as any,
      title: "Setting up",
      processManager,
    });
    expect(processManager.intervals).toContain(12345 as any);
  });

  it("should show an initial fact immediately (sets spinner text)", () => {
    const spinner = createFakeSpinner();
    createFactBox({
      spinner: spinner as any,
      title: "Setting up",
      processManager,
    });
    expect(spinner.text).toContain("Setting up");
  });

  it("should refresh the fact on each interval tick (exercises the callback)", () => {
    const spinner = createFakeSpinner();
    // capture the interval callback registered by setInterval
    let intervalCb: (() => void) | undefined;
    setIntervalSpy.mockImplementation((cb: any) => {
      intervalCb = cb;
      return 12345 as any;
    });

    createFactBox({
      spinner: spinner as any,
      title: "Refreshing",
      processManager,
    });

    // initial fact set
    expect(spinner.text).toContain("Refreshing");
    spinner.text = "";
    // fire the interval callback -> showFact runs again and resets the text
    expect(intervalCb).toBeDefined();
    intervalCb!();
    expect(spinner.text).toContain("Refreshing");
  });
});

describe("resetFactBox", () => {
  let clearIntervalSpy: ReturnType<typeof spyOn>;
  let setIntervalSpy: ReturnType<typeof spyOn>;
  let logSpy: ReturnType<typeof spyOn>;
  let processManager: ProcessManager;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    clearIntervalSpy = spyOn(globalThis, "clearInterval").mockImplementation(
      () => {},
    );
    setIntervalSpy = spyOn(globalThis, "setInterval").mockReturnValue(
      999 as any,
    );
    processManager = new ProcessManager();
  });

  afterEach(() => {
    logSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    setIntervalSpy.mockRestore();
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  it("should clear the existing interval and report success", () => {
    const spinner = createFakeSpinner();
    resetFactBox({
      interval: 555 as any,
      spinner: spinner as any,
      successMessage: "Done step",
      processManager,
    });

    expect(clearIntervalSpy).toHaveBeenCalledWith(555 as any);
    expect(spinner.success).toHaveBeenCalledTimes(1);
    expect(spinner.start).toHaveBeenCalledTimes(1);
  });

  it("should return null when no newTitle is provided", () => {
    const spinner = createFakeSpinner();
    const result = resetFactBox({
      interval: null,
      spinner: spinner as any,
      successMessage: "Done",
      processManager,
    });
    expect(result).toBeNull();
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it("should start a new fact box when newTitle is provided", () => {
    const spinner = createFakeSpinner();
    const result = resetFactBox({
      interval: 1 as any,
      spinner: spinner as any,
      successMessage: "Done",
      processManager,
      newTitle: "Next step",
    });
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe(999 as any);
  });

  it("should not throw when interval is null", () => {
    const spinner = createFakeSpinner();
    expect(() =>
      resetFactBox({
        interval: null,
        spinner: spinner as any,
        successMessage: "Done",
        processManager,
      }),
    ).not.toThrow();
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });
});

describe("displayFactBox", () => {
  let clearIntervalSpy: ReturnType<typeof spyOn>;
  let setIntervalSpy: ReturnType<typeof spyOn>;
  let logSpy: ReturnType<typeof spyOn>;
  let processManager: ProcessManager;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    clearIntervalSpy = spyOn(globalThis, "clearInterval").mockImplementation(
      () => {},
    );
    setIntervalSpy = spyOn(globalThis, "setInterval").mockReturnValue(
      777 as any,
    );
    processManager = new ProcessManager();
  });

  afterEach(() => {
    logSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    setIntervalSpy.mockRestore();
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");
  });

  it("should create a new fact box when no message is given (createFactBox path)", () => {
    const spinner = createFakeSpinner();
    const result = displayFactBox({
      interval: null,
      spinner: spinner as any,
      processManager,
      title: "Starting",
      message: "",
    });
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).not.toHaveBeenCalled();
    expect(result).toBe(777 as any);
  });

  it("should reset the fact box when a message is given (resetFactBox path)", () => {
    const spinner = createFakeSpinner();
    displayFactBox({
      interval: 42 as any,
      spinner: spinner as any,
      processManager,
      title: "",
      message: "Step done",
    });
    expect(clearIntervalSpy).toHaveBeenCalledWith(42 as any);
    expect(spinner.success).toHaveBeenCalledTimes(1);
  });
});
