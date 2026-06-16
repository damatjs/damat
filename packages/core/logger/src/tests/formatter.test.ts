import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { Formatter } from "../formatter";
import { Colorizer } from "../colorizer";

/**
 * Formatter is tested with a colorizer that is forced OFF (new Colorizer(false))
 * so the structure is deterministic and free of ANSI codes. A separate suite
 * checks JSON mode (which ignores the colorizer entirely).
 */
function plainFormatter(format: "pretty" | "simple" | "json") {
  return new Formatter(format, new Colorizer(false));
}

type Entry = Parameters<Formatter["formatEntry"]>[0];

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    timestamp: "2024-03-14 09:26:53.589",
    level: "info",
    message: "hello world",
    context: undefined,
    error: undefined,
    prefix: undefined,
    ...overrides,
  };
}

describe("Formatter.getTimestamp", () => {
  afterEach(() => {
    // restore any faked timers
  });

  it("formats a fixed date deterministically as YYYY-MM-DD HH:mm:ss.mmm", () => {
    // Construct a local date so the formatter's local getters are predictable.
    const fixed = new Date(2024, 2, 14, 9, 6, 3, 7); // March 14 2024, 09:06:03.007 local
    const spy = spyOn(globalThis, "Date").mockImplementation(
      (() => fixed) as unknown as DateConstructor,
    );

    const f = plainFormatter("pretty");
    const ts = f.getTimestamp();
    spy.mockRestore();

    expect(ts).toBe("2024-03-14 09:06:03.007");
  });

  it("zero-pads month, day, time components and milliseconds", () => {
    const fixed = new Date(2024, 0, 1, 0, 0, 0, 9); // Jan 1 2024 00:00:00.009
    const spy = spyOn(globalThis, "Date").mockImplementation(
      (() => fixed) as unknown as DateConstructor,
    );
    const ts = plainFormatter("pretty").getTimestamp();
    spy.mockRestore();
    expect(ts).toBe("2024-01-01 00:00:00.009");
  });
});

describe("Formatter.formatEntry: json mode", () => {
  it("serializes the entry object verbatim and ignores colorizer", () => {
    const f = plainFormatter("json");
    const e = entry({ context: { a: 1 }, prefix: "svc" });
    const out = f.formatEntry(e);
    expect(JSON.parse(out)).toEqual(e as unknown as Record<string, unknown>);
  });

  it("includes error info in json", () => {
    const f = plainFormatter("json");
    const e = entry({ error: { name: "Error", message: "x", stack: "s" } });
    expect(JSON.parse(out_(f, e)).error).toEqual({ name: "Error", message: "x", stack: "s" });
  });
});

function out_(f: Formatter, e: Entry): string {
  return f.formatEntry(e);
}

describe("Formatter.formatEntry: pretty mode structure", () => {
  it("joins timestamp, level (badge+label), message with single spaces", () => {
    const f = plainFormatter("pretty");
    const out = f.formatEntry(entry());
    // timestamp + level badge "● INFO " + message
    expect(out).toBe("2024-03-14 09:26:53.589 ● INFO  hello world");
  });

  it("omits the timestamp segment when timestamp is empty string", () => {
    const f = plainFormatter("pretty");
    const out = f.formatEntry(entry({ timestamp: "" }));
    expect(out).toBe("● INFO  hello world");
    expect(out.startsWith(" ")).toBe(false);
  });

  it("inserts the prefix between level and message when present", () => {
    const f = plainFormatter("pretty");
    const out = f.formatEntry(entry({ prefix: "api", timestamp: "" }));
    expect(out).toBe("● INFO  [api] hello world");
  });

  it("appends serialized context when non-empty", () => {
    const f = plainFormatter("pretty");
    const out = f.formatEntry(entry({ timestamp: "", context: { userId: 7 } }));
    expect(out).toBe('● INFO  hello world {"userId":7}');
  });

  it("omits context segment when context is empty object", () => {
    const f = plainFormatter("pretty");
    const out = f.formatEntry(entry({ timestamp: "", context: {} }));
    expect(out).toBe("● INFO  hello world");
  });

  it("omits context segment when context is undefined", () => {
    const f = plainFormatter("pretty");
    const out = f.formatEntry(entry({ timestamp: "", context: undefined }));
    expect(out).toBe("● INFO  hello world");
  });

  it("appends error block after the main line", () => {
    const f = plainFormatter("pretty");
    const out = f.formatEntry(
      entry({
        timestamp: "",
        level: "error",
        message: "request failed",
        error: { name: "Boom", message: "kaput", stack: "trace" },
      }),
    );
    // message colored red... but colors are off, so plain
    expect(out).toBe("✗ ERROR request failed\nBoom: kaput\ntrace");
  });
});

describe("Formatter.formatEntry: simple mode", () => {
  it("behaves like pretty (non-json) for structure", () => {
    // The implementation treats any non-"json" format the same in formatEntry.
    const pretty = plainFormatter("pretty").formatEntry(entry({ timestamp: "" }));
    const simple = plainFormatter("simple").formatEntry(entry({ timestamp: "" }));
    expect(simple).toBe(pretty);
  });
});
