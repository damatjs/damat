import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Logger } from "../logger";
import { captureConsole, stripAnsi, type ConsoleCapture } from "./helpers";

/**
 * The Logger writes its formatted output to console.log / console.warn /
 * console.error depending on level. We capture those sinks (see helpers) so we
 * can assert routing + content without touching real stdout. Colors default to
 * ON in config but the Colorizer disables them in a non-TTY test process, so
 * captured lines are plain text — we still stripAnsi defensively.
 */
let cap: ConsoleCapture;

beforeEach(() => {
  cap = captureConsole();
});

afterEach(() => {
  cap.restore();
});

function plainLog(cap: ConsoleCapture): string[] {
  return cap.logLines().map(stripAnsi);
}

describe("Logger: level filtering", () => {
  it("default level is info: debug is suppressed, info passes", () => {
    const log = new Logger({ timestamp: false });
    log.debug("dbg");
    log.info("inf");
    const lines = plainLog(cap);
    expect(lines.some((l) => l.includes("dbg"))).toBe(false);
    expect(lines.some((l) => l.includes("inf"))).toBe(true);
  });

  it("level=debug lets everything through", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.debug("dbg");
    log.info("inf");
    expect(plainLog(cap).join("\n")).toContain("dbg");
    expect(plainLog(cap).join("\n")).toContain("inf");
  });

  it("level=warn suppresses info/success but allows warn/error", () => {
    const log = new Logger({ timestamp: false, level: "warn" });
    log.info("inf");
    log.success("ok");
    log.warn("careful");
    log.error("bad");
    const log_out = plainLog(cap).join("\n");
    expect(log_out).not.toContain("inf");
    expect(log_out).not.toContain("ok");
    expect(cap.warnLines().map(stripAnsi).join("\n")).toContain("careful");
    expect(cap.errorLines().map(stripAnsi).join("\n")).toContain("bad");
  });

  it("respects the numeric ordering of LOG_LEVELS (skip is the highest, suppresses all else)", () => {
    const log = new Logger({ timestamp: false, level: "skip" });
    log.debug("a");
    log.info("b");
    log.error("c"); // error ordinal 7 < skip ordinal 9 -> suppressed
    log.skip("d"); // skip ordinal 9 -> passes
    const all = [...plainLog(cap), ...cap.errorLines().map(stripAnsi)].join("\n");
    expect(all).not.toContain("a");
    expect(all).not.toContain("b");
    expect(all).not.toContain("c");
    expect(plainLog(cap).join("\n")).toContain("d");
  });
});

describe("Logger: output routing per level", () => {
  it("routes error and fatal to console.error", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.error("e1");
    log.fatal("f1");
    const errs = cap.errorLines().map(stripAnsi).join("\n");
    expect(errs).toContain("e1");
    expect(errs).toContain("f1");
    expect(plainLog(cap).join("\n")).not.toContain("e1");
  });

  it("routes warn to console.warn", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.warn("w1");
    expect(cap.warnLines().map(stripAnsi).join("\n")).toContain("w1");
    expect(plainLog(cap).join("\n")).not.toContain("w1");
  });

  it("routes info/debug/success/progress/cached/waiting/skip to console.log", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.info("i");
    log.debug("d");
    log.success("s");
    log.progress("p");
    log.cached("c");
    log.waiting("wa");
    log.skip("sk");
    const out = plainLog(cap).join("\n");
    for (const m of ["i", "d", "s", "p", "c", "wa", "sk"]) {
      expect(out).toContain(m);
    }
    expect(cap.warnLines()).toHaveLength(0);
    expect(cap.errorLines()).toHaveLength(0);
  });
});

describe("Logger: message + metadata formatting", () => {
  it("includes the message text", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.info("a clear message");
    expect(plainLog(cap)[0]).toContain("a clear message");
  });

  it("renders context metadata as JSON", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.info("with meta", { userId: 42, role: "admin" });
    expect(plainLog(cap)[0]).toContain('{"userId":42,"role":"admin"}');
  });

  it("does not emit a context segment for empty/absent context", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.info("no meta");
    log.info("empty meta", {});
    for (const line of plainLog(cap)) {
      expect(line).not.toContain("{");
    }
  });

  it("includes the level label", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.warn("careful");
    expect(cap.warnLines().map(stripAnsi)[0]).toContain("WARN");
  });

  it("emits a timestamp segment when timestamp enabled", () => {
    const log = new Logger({ level: "debug" }); // timestamp default true
    log.info("hello");
    // matches YYYY-MM-DD HH:mm:ss.mmm
    expect(plainLog(cap)[0]).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/);
  });

  it("omits timestamp when disabled", () => {
    const log = new Logger({ level: "debug", timestamp: false });
    log.info("hello");
    expect(plainLog(cap)[0]).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe("Logger: error/fatal error argument handling", () => {
  it("renders Error name/message/stack for error()", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    const err = new Error("kaboom");
    log.error("failed", err);
    const out = cap.errorLines().map(stripAnsi).join("\n");
    expect(out).toContain("failed");
    expect(out).toContain("Error: kaboom");
  });

  it("ignores non-Error values passed as error (no error block)", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.error("failed", "just a string");
    const out = cap.errorLines().map(stripAnsi).join("\n");
    expect(out).toContain("failed");
    // A plain string is not an Error, so no "name: message" error block.
    expect(out).not.toContain("just a string");
  });

  it("error() third arg is context (metadata), second is the error", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.error("failed", new Error("e"), { requestId: "abc" });
    const out = cap.errorLines().map(stripAnsi).join("\n");
    expect(out).toContain('{"requestId":"abc"}');
  });
});

describe("Logger.request", () => {
  it("logs status >= 500 as error", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.request({ requestId: "r1", method: "GET", path: "/x", status: 500, duration: 12 });
    const out = cap.errorLines().map(stripAnsi).join("\n");
    expect(out).toContain("GET /x 500 12ms");
    expect(out).toContain("ERROR");
  });

  it("logs 4xx as warn and 2xx as info, embedding requestId in context", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.request({ requestId: "r4", method: "POST", path: "/y", status: 404, duration: 3 });
    log.request({ requestId: "r2", method: "GET", path: "/z", status: 200, duration: 1 });

    const warn = cap.warnLines().map(stripAnsi).join("\n");
    expect(warn).toContain("POST /y 404 3ms");
    expect(warn).toContain('"requestId":"r4"');

    const info = plainLog(cap).join("\n");
    expect(info).toContain("GET /z 200 1ms");
    expect(info).toContain('"requestId":"r2"');
  });

  it("merges identifier label/value pairs into context", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.request({
      requestId: "r",
      method: "GET",
      path: "/",
      status: 200,
      duration: 0,
      identifier: [
        { label: "tenant", value: "acme" },
        { label: "user", value: "u1" },
      ],
    });
    const out = plainLog(cap).join("\n");
    expect(out).toContain('"tenant":"acme"');
    expect(out).toContain('"user":"u1"');
  });

  it("includes request error block for failed requests", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    log.request({
      requestId: "r",
      method: "GET",
      path: "/",
      status: 500,
      duration: 0,
      error: new Error("upstream"),
    });
    expect(cap.errorLines().map(stripAnsi).join("\n")).toContain("Error: upstream");
  });
});

describe("Logger: json format", () => {
  it("emits a single-line JSON object with level/message/context", () => {
    const log = new Logger({ timestamp: false, level: "debug", format: "json" });
    log.info("structured", { k: "v" });
    const parsed = JSON.parse(cap.logLines()[0]);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("structured");
    expect(parsed.context).toEqual({ k: "v" });
  });
});

describe("Logger: prefix and child/withPrefix factory", () => {
  it("renders configured prefix", () => {
    const log = new Logger({ timestamp: false, level: "debug", prefix: "svc" });
    log.info("hi");
    expect(plainLog(cap)[0]).toContain("[svc]");
  });

  it("child() returns a logger that funnels through the parent", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    const c = log.child({ scope: "child" });
    c.info("from child");
    expect(plainLog(cap)[0]).toContain("from child");
    expect(plainLog(cap)[0]).toContain('"scope":"child"');
  });

  // Regression: Logger.withPrefix() builds a ChildLogger holding the composed
  // prefix "base:sub", and ChildLogger forwards its own prefix to the parent's
  // logWithPrefix entry point — so the composed ":sub" segment reaches output.
  it("withPrefix() child emits the composed prefix, not just the parent's", () => {
    const log = new Logger({ timestamp: false, level: "debug", prefix: "base" });
    const c = log.withPrefix("sub");
    c.info("hi");
    expect(plainLog(cap)[0]).toContain("[base:sub]");
  });

  it("withPrefix() on a logger WITHOUT a prefix emits the child's prefix", () => {
    const log = new Logger({ timestamp: false, level: "debug" });
    const c = log.withPrefix("only");
    c.info("hi");
    expect(plainLog(cap)[0]).toContain("[only]");
  });
});

describe("Logger.create / close", () => {
  it("create() returns a Logger instance", () => {
    expect(Logger.create({ timestamp: false })).toBeInstanceOf(Logger);
  });

  it("close() is safe to call when no file transport exists", () => {
    const log = new Logger({ timestamp: false });
    expect(() => log.close()).not.toThrow();
    expect(() => log.close()).not.toThrow();
  });
});
