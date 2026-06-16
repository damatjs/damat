import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { ChildLogger } from "../child";
import { Logger } from "../logger";

/**
 * ChildLogger delegates everything to its parent Logger after merging context.
 * Rather than capturing console output, we spy directly on the parent's
 * logWithPrefix entry point so we can assert exactly what bindings/context/prefix
 * get forwarded — this isolates the merge/inheritance behavior from the formatter.
 */
function makeParent() {
  const parent = new Logger({ timestamp: false, level: "debug" });
  return parent;
}

describe("ChildLogger: context binding + merge", () => {
  it("forwards bound context to the parent for every leveled method", () => {
    const parent = makeParent();
    const log = spyOn(parent, "logWithPrefix").mockImplementation(() => {});

    const child = new ChildLogger(parent, { service: "auth" });
    child.debug("d");
    child.info("i");
    child.warn("w");
    child.success("s");

    expect(log).toHaveBeenCalledWith("debug", "d", undefined, { service: "auth" });
    expect(log).toHaveBeenCalledWith("info", "i", undefined, { service: "auth" });
    expect(log).toHaveBeenCalledWith("warn", "w", undefined, { service: "auth" });
    expect(log).toHaveBeenCalledWith("success", "s", undefined, { service: "auth" });
  });

  it("merges per-call context with bound context (per-call wins on key clash)", () => {
    const parent = makeParent();
    const log = spyOn(parent, "logWithPrefix").mockImplementation(() => {});
    const child = new ChildLogger(parent, { a: 1, shared: "bound" });
    child.info("m", { b: 2, shared: "call" });
    expect(log).toHaveBeenCalledWith("info", "m", undefined, { a: 1, b: 2, shared: "call" });
  });

  it("error/fatal forward (level, message, prefix, mergedContext, error) in correct order", () => {
    const parent = makeParent();
    const log = spyOn(parent, "logWithPrefix").mockImplementation(() => {});
    const err = new Error("x");
    const child = new ChildLogger(parent, { svc: "db" });
    child.error("failed", err, { op: "read" });
    child.fatal("dead", err);
    expect(log).toHaveBeenCalledWith("error", "failed", undefined, { svc: "db", op: "read" }, err);
    expect(log).toHaveBeenCalledWith("fatal", "dead", undefined, { svc: "db" }, err);
  });

  it("request() delegates straight to the parent unchanged", () => {
    const parent = makeParent();
    const request = spyOn(parent, "request").mockImplementation(() => {});
    const data = { requestId: "r", method: "GET", path: "/", status: 200, duration: 1 };
    new ChildLogger(parent, { a: 1 }).request(data);
    expect(request).toHaveBeenCalledWith(data);
  });
});

describe("ChildLogger: nested child()", () => {
  it("a grandchild inherits and merges both ancestors' context", () => {
    const parent = makeParent();
    const log = spyOn(parent, "logWithPrefix").mockImplementation(() => {});
    const child = new ChildLogger(parent, { a: 1 });
    const grandchild = child.child({ b: 2 });
    grandchild.info("m", { c: 3 });
    expect(log).toHaveBeenCalledWith("info", "m", undefined, { a: 1, b: 2, c: 3 });
  });

  it("child() points at the SAME root parent (flattened, not chained)", () => {
    const parent = makeParent();
    const log = spyOn(parent, "logWithPrefix").mockImplementation(() => {});
    const child = new ChildLogger(parent, { a: 1 });
    const grandchild = child.child({ b: 2 });
    grandchild.info("m");
    // Only the root parent receives the call (single delegation hop).
    expect(log).toHaveBeenCalledTimes(1);
  });
});

describe("ChildLogger: withPrefix", () => {
  it("withPrefix on a bare child sets the prefix and keeps context", () => {
    const parent = makeParent();
    const log = spyOn(parent, "logWithPrefix").mockImplementation(() => {});
    const child = new ChildLogger(parent, { a: 1 });
    const prefixed = child.withPrefix("api");
    prefixed.info("m");
    // context still forwarded, and the child's prefix is passed through
    expect(log).toHaveBeenCalledWith("info", "m", "api", { a: 1 });
  });

  // Regression: ChildLogger.withPrefix() composes a new prefix ("base:sub") and
  // forwards it to the parent's logWithPrefix entry point, so the child's
  // composed prefix DOES reach the formatted output.
  it("withPrefix composes its prefix and it reaches the output", () => {
    const parent = makeParent(); // parent has no prefix
    const child = new ChildLogger(parent, {}, "base");
    const prefixed = child.withPrefix("sub");
    const log = spyOn(console, "log").mockImplementation(() => {});
    prefixed.info("m");
    const line = String(log.mock.calls[0][0]);
    log.mockRestore();
    // The composed "base:sub" prefix segment is emitted.
    expect(line).toContain("[base:sub]");
  });

  it("withPrefix on a parent-less-prefix child emits its own prefix", () => {
    const parent = makeParent();
    const child = new ChildLogger(parent, {}, "only");
    const log = spyOn(console, "log").mockImplementation(() => {});
    child.info("m");
    const line = String(log.mock.calls[0][0]);
    log.mockRestore();
    expect(line).toContain("[only]");
  });
});

describe("ChildLogger: integration through real parent output", () => {
  let logSpy: ReturnType<typeof spyOn>;
  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  it("emits merged context into the actual formatted line", () => {
    const parent = new Logger({ timestamp: false, level: "debug" });
    const child = parent.child({ scope: "worker" });
    child.info("tick", { n: 5 });
    const line = String(logSpy.mock.calls[0][0]);
    expect(line).toContain("tick");
    expect(line).toContain('"scope":"worker"');
    expect(line).toContain('"n":5');
  });

  it("emits the composed prefix alongside merged context", () => {
    const parent = new Logger({ timestamp: false, level: "debug", prefix: "base" });
    const child = parent.withPrefix("sub").child({ scope: "worker" });
    child.info("tick");
    const line = String(logSpy.mock.calls[0][0]);
    expect(line).toContain("[base:sub]");
    expect(line).toContain('"scope":"worker"');
  });
});
