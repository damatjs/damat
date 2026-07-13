import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import {
  QueryLogger,
  getQueryLogger,
  setQueryLogger,
  configureQueryLogger,
} from "../logger";
import { FakeLogger } from "./helpers";

let fake: FakeLogger;

beforeEach(() => {
  fake = new FakeLogger();
});

describe("QueryLogger › logQuery", () => {
  it("logs a debug entry with the sql in context", () => {
    const ql = new QueryLogger({}, fake);
    ql.logQuery("SELECT 1");

    const calls = fake.callsTo("debug");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args[0]).toBe("Query executed");
    expect(calls[0]!.args[1]).toEqual({ sql: "SELECT 1" });
  });

  it("includes params in context only when non-empty", () => {
    const ql = new QueryLogger({}, fake);
    ql.logQuery("SELECT $1", [42]);
    expect(fake.callsTo("debug")[0]!.args[1]).toEqual({
      sql: "SELECT $1",
      params: [42],
    });
  });

  it("omits params when the array is empty", () => {
    const ql = new QueryLogger({}, fake);
    ql.logQuery("SELECT 1", []);
    expect(fake.callsTo("debug")[0]!.args[1]).toEqual({ sql: "SELECT 1" });
  });

  it("does nothing when logQueries is disabled", () => {
    const ql = new QueryLogger({ logQueries: false }, fake);
    ql.logQuery("SELECT 1");
    expect(fake.callsTo("debug")).toHaveLength(0);
  });

  it("does nothing when the logger is globally disabled", () => {
    const ql = new QueryLogger({ enabled: false }, fake);
    ql.logQuery("SELECT 1");
    expect(fake.callsTo("debug")).toHaveLength(0);
  });
});

describe("QueryLogger › logQueryError", () => {
  it("logs an error entry with the error object and sql context", () => {
    const ql = new QueryLogger({}, fake);
    const err = new Error("boom");
    ql.logQueryError(err, "SELECT 1", ["a"]);

    const calls = fake.callsTo("error");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args[0]).toBe("Query error");
    expect(calls[0]!.args[1]).toBe(err);
    expect(calls[0]!.args[2]).toEqual({ sql: "SELECT 1", params: ["a"] });
  });

  it("omits params from context when none are given", () => {
    const ql = new QueryLogger({}, fake);
    ql.logQueryError(new Error("x"), "SELECT 1");
    expect(fake.callsTo("error")[0]!.args[2]).toEqual({ sql: "SELECT 1" });
  });

  it("respects logErrors=false", () => {
    const ql = new QueryLogger({ logErrors: false }, fake);
    ql.logQueryError(new Error("x"), "SELECT 1");
    expect(fake.callsTo("error")).toHaveLength(0);
  });

  it("respects enabled=false even if logErrors is true", () => {
    const ql = new QueryLogger({ enabled: false, logErrors: true }, fake);
    ql.logQueryError(new Error("x"), "SELECT 1");
    expect(fake.callsTo("error")).toHaveLength(0);
  });
});

describe("QueryLogger › logSlowQuery", () => {
  it("warns when duration strictly exceeds the threshold", () => {
    const ql = new QueryLogger({ slowQueryThreshold: 100 }, fake);
    ql.logSlowQuery("SELECT 1", 150, ["p"]);

    const calls = fake.callsTo("warn");
    expect(calls).toHaveLength(1);
    expect(calls[0]!.args[0]).toBe("Slow query (150ms)");
    expect(calls[0]!.args[1]).toEqual({
      sql: "SELECT 1",
      duration: 150,
      threshold: 100,
      params: ["p"],
    });
  });

  it("does not warn when duration equals the threshold (strict >)", () => {
    const ql = new QueryLogger({ slowQueryThreshold: 100 }, fake);
    ql.logSlowQuery("SELECT 1", 100);
    expect(fake.callsTo("warn")).toHaveLength(0);
  });

  it("does not warn when duration is below the threshold", () => {
    const ql = new QueryLogger({ slowQueryThreshold: 1000 }, fake);
    ql.logSlowQuery("SELECT 1", 5);
    expect(fake.callsTo("warn")).toHaveLength(0);
  });

  it("uses the default threshold of 1000ms", () => {
    const ql = new QueryLogger({}, fake);
    ql.logSlowQuery("SELECT 1", 1001);
    expect(fake.callsTo("warn")).toHaveLength(1);
    fake.reset();
    ql.logSlowQuery("SELECT 1", 999);
    expect(fake.callsTo("warn")).toHaveLength(0);
  });

  it("omits params from the warn context when none provided", () => {
    const ql = new QueryLogger({ slowQueryThreshold: 10 }, fake);
    ql.logSlowQuery("SELECT 1", 50);
    expect(fake.callsTo("warn")[0]!.args[1]).toEqual({
      sql: "SELECT 1",
      duration: 50,
      threshold: 10,
    });
  });

  it("respects logSlowQueries=false", () => {
    const ql = new QueryLogger(
      { logSlowQueries: false, slowQueryThreshold: 1 },
      fake,
    );
    ql.logSlowQuery("SELECT 1", 9999);
    expect(fake.callsTo("warn")).toHaveLength(0);
  });
});

describe("QueryLogger › logTransaction", () => {
  it("logs a debug entry for each transaction action", () => {
    const ql = new QueryLogger({}, fake);
    ql.logTransaction("begin");
    ql.logTransaction("commit");
    ql.logTransaction("rollback");

    const calls = fake.callsTo("debug");
    expect(calls.map((c) => c.args[0])).toEqual([
      "Transaction: begin",
      "Transaction: commit",
      "Transaction: rollback",
    ]);
  });

  it("respects logTransaction=false", () => {
    const ql = new QueryLogger({ logTransaction: false }, fake);
    ql.logTransaction("begin");
    expect(fake.callsTo("debug")).toHaveLength(0);
  });

  it("respects enabled=false", () => {
    const ql = new QueryLogger({ enabled: false }, fake);
    ql.logTransaction("commit");
    expect(fake.callsTo("debug")).toHaveLength(0);
  });
});

describe("QueryLogger › enable / disable / setOptions", () => {
  it("disable() suppresses all logging; enable() restores it", () => {
    const ql = new QueryLogger({}, fake);

    ql.disable();
    ql.logQuery("SELECT 1");
    expect(fake.callsTo("debug")).toHaveLength(0);

    ql.enable();
    ql.logQuery("SELECT 1");
    expect(fake.callsTo("debug")).toHaveLength(1);
  });

  it("setOptions merges with existing options without dropping defaults", () => {
    const ql = new QueryLogger({}, fake);
    // Turn off only queries; errors should still flow.
    ql.setOptions({ logQueries: false });

    ql.logQuery("SELECT 1");
    expect(fake.callsTo("debug")).toHaveLength(0);

    ql.logQueryError(new Error("x"), "SELECT 1");
    expect(fake.callsTo("error")).toHaveLength(1);
  });

  it("setOptions can change the slow-query threshold dynamically", () => {
    const ql = new QueryLogger({ slowQueryThreshold: 1000 }, fake);
    ql.logSlowQuery("SELECT 1", 500);
    expect(fake.callsTo("warn")).toHaveLength(0);

    ql.setOptions({ slowQueryThreshold: 100 });
    ql.logSlowQuery("SELECT 1", 500);
    expect(fake.callsTo("warn")).toHaveLength(1);
  });
});

describe("QueryLogger › default options", () => {
  it("enables everything by default and falls back to a real Logger", () => {
    // No injected logger: the constructor builds a real @damatjs/logger Logger.
    // We spy on console.* so the real debug log path is exercised without noise.
    const debugSpy = spyOn(console, "log").mockImplementation(() => {});
    try {
      const ql = new QueryLogger();
      ql.logQuery("SELECT 1");
      // Real Logger default level is "info", so "debug" is filtered out and
      // console.log is NOT called. This documents the default-level behavior.
      expect(debugSpy).not.toHaveBeenCalled();
    } finally {
      debugSpy.mockRestore();
    }
  });

  it("routes warnings through the real Logger's console.warn at default level", () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    try {
      const ql = new QueryLogger({ slowQueryThreshold: 10 });
      ql.logSlowQuery("SELECT 1", 500);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("global query logger singleton", () => {
  // The module holds a private `globalLogger` singleton. There is no public
  // reset-to-null, so each test deterministically reseeds it via
  // setQueryLogger / configureQueryLogger before asserting.
  let original: QueryLogger;

  beforeEach(() => {
    // Snapshot whatever the singleton currently is so we can restore it.
    original = getQueryLogger();
  });

  afterEach(() => {
    setQueryLogger(original);
  });

  it("getQueryLogger lazily creates and then returns the same instance", () => {
    const seed = new QueryLogger({}, fake);
    setQueryLogger(seed);
    expect(getQueryLogger()).toBe(seed);
    expect(getQueryLogger()).toBe(seed); // stable across calls
  });

  it("setQueryLogger replaces the global instance", () => {
    const a = new QueryLogger({}, fake);
    const b = new QueryLogger({}, fake);
    setQueryLogger(a);
    expect(getQueryLogger()).toBe(a);
    setQueryLogger(b);
    expect(getQueryLogger()).toBe(b);
  });

  it("configureQueryLogger creates, installs, and returns a new configured instance", () => {
    const created = configureQueryLogger({ logQueries: false }, fake);
    expect(getQueryLogger()).toBe(created);

    // The returned instance honors the supplied options & injected logger.
    created.logQuery("SELECT 1");
    expect(fake.callsTo("debug")).toHaveLength(0);

    created.logQueryError(new Error("x"), "SELECT 1");
    expect(fake.callsTo("error")).toHaveLength(1);
  });

  it("getQueryLogger returns a real QueryLogger instance", () => {
    expect(getQueryLogger()).toBeInstanceOf(QueryLogger);
  });
});
