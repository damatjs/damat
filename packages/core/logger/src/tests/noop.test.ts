import { describe, it, expect, afterEach, spyOn } from "bun:test";
import { NoopLogger, NOOP_LOGGER } from "../noop";

/**
 * The NoopLogger must never produce any output and never throw. We spy on every
 * console method and assert nothing is ever called, across all API methods.
 */
let spies: ReturnType<typeof spyOn>[] = [];

afterEach(() => {
  spies.forEach((s) => s.mockRestore());
  spies = [];
});

function spyAllConsole() {
  spies = [
    spyOn(console, "log").mockImplementation(() => {}),
    spyOn(console, "warn").mockImplementation(() => {}),
    spyOn(console, "error").mockImplementation(() => {}),
  ];
  return spies;
}

describe("NoopLogger: all leveled methods are silent no-ops", () => {
  it("never calls console for any level", () => {
    const [log, warn, error] = spyAllConsole();
    const n = new NoopLogger();
    n.debug("a");
    n.info("b");
    n.progress("c");
    n.cached("d");
    n.waiting("e");
    n.success("f");
    n.warn("g");
    n.error("h", new Error("x"));
    n.fatal("i", new Error("y"));
    n.skip("j");
    n.request({
      requestId: "r",
      method: "GET",
      path: "/",
      status: 500,
      duration: 1,
    });
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("returns undefined from leveled methods", () => {
    const n = new NoopLogger();
    expect(n.info("x")).toBeUndefined();
    expect(n.error("x", new Error("y"))).toBeUndefined();
  });
});

describe("NoopLogger: child / withPrefix produce more noops", () => {
  it("child() returns another NoopLogger that stays silent", () => {
    spyAllConsole();
    const child = new NoopLogger({ a: 1 }).child({ b: 2 });
    expect(child).toBeInstanceOf(NoopLogger);
    child.info("nope");
    expect(spies.every((s) => s.mock.calls.length === 0)).toBe(true);
  });

  it("withPrefix() returns another NoopLogger that stays silent", () => {
    spyAllConsole();
    const prefixed = new NoopLogger({}, "base").withPrefix("sub");
    expect(prefixed).toBeInstanceOf(NoopLogger);
    prefixed.warn("nope");
    expect(spies.every((s) => s.mock.calls.length === 0)).toBe(true);
  });

  it("nested child/withPrefix never throw", () => {
    const n = new NoopLogger();
    expect(() =>
      n.child({ a: 1 }).child({ b: 2 }).withPrefix("p").info("x"),
    ).not.toThrow();
  });
});

describe("NOOP_LOGGER singleton", () => {
  it("is a NoopLogger instance and is silent", () => {
    const [log] = spyAllConsole();
    expect(NOOP_LOGGER).toBeInstanceOf(NoopLogger);
    NOOP_LOGGER.info("x");
    NOOP_LOGGER.error("y", new Error("z"));
    expect(log).not.toHaveBeenCalled();
  });
});
