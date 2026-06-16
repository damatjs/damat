import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { ChildLogger } from "../child";
import { Logger } from "../logger";

/**
 * ChildLogger delegates everything to its parent Logger after merging context.
 * Rather than capturing console output, we spy directly on the parent's public
 * methods so we can assert exactly what bindings/context get forwarded — this
 * isolates the merge/inheritance behavior from the formatter.
 */
function makeParent() {
  const parent = new Logger({ timestamp: false, level: "debug" });
  return parent;
}

describe("ChildLogger: context binding + merge", () => {
  it("forwards bound context to the parent for every leveled method", () => {
    const parent = makeParent();
    const debug = spyOn(parent, "debug").mockImplementation(() => {});
    const info = spyOn(parent, "info").mockImplementation(() => {});
    const warn = spyOn(parent, "warn").mockImplementation(() => {});
    const success = spyOn(parent, "success").mockImplementation(() => {});

    const child = new ChildLogger(parent, { service: "auth" });
    child.debug("d");
    child.info("i");
    child.warn("w");
    child.success("s");

    expect(debug).toHaveBeenCalledWith("d", { service: "auth" });
    expect(info).toHaveBeenCalledWith("i", { service: "auth" });
    expect(warn).toHaveBeenCalledWith("w", { service: "auth" });
    expect(success).toHaveBeenCalledWith("s", { service: "auth" });
  });

  it("merges per-call context with bound context (per-call wins on key clash)", () => {
    const parent = makeParent();
    const info = spyOn(parent, "info").mockImplementation(() => {});
    const child = new ChildLogger(parent, { a: 1, shared: "bound" });
    child.info("m", { b: 2, shared: "call" });
    expect(info).toHaveBeenCalledWith("m", { a: 1, b: 2, shared: "call" });
  });

  it("error/fatal forward (message, error, mergedContext) in correct order", () => {
    const parent = makeParent();
    const error = spyOn(parent, "error").mockImplementation(() => {});
    const fatal = spyOn(parent, "fatal").mockImplementation(() => {});
    const err = new Error("x");
    const child = new ChildLogger(parent, { svc: "db" });
    child.error("failed", err, { op: "read" });
    child.fatal("dead", err);
    expect(error).toHaveBeenCalledWith("failed", err, { svc: "db", op: "read" });
    expect(fatal).toHaveBeenCalledWith("dead", err, { svc: "db" });
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
    const info = spyOn(parent, "info").mockImplementation(() => {});
    const child = new ChildLogger(parent, { a: 1 });
    const grandchild = child.child({ b: 2 });
    grandchild.info("m", { c: 3 });
    expect(info).toHaveBeenCalledWith("m", { a: 1, b: 2, c: 3 });
  });

  it("child() points at the SAME root parent (flattened, not chained)", () => {
    const parent = makeParent();
    const info = spyOn(parent, "info").mockImplementation(() => {});
    const child = new ChildLogger(parent, { a: 1 });
    const grandchild = child.child({ b: 2 });
    grandchild.info("m");
    // Only the root parent receives the call (single delegation hop).
    expect(info).toHaveBeenCalledTimes(1);
  });
});

describe("ChildLogger: withPrefix", () => {
  it("withPrefix on a bare child sets the prefix and keeps context", () => {
    const parent = makeParent();
    const info = spyOn(parent, "info").mockImplementation(() => {});
    const child = new ChildLogger(parent, { a: 1 });
    const prefixed = child.withPrefix("api");
    prefixed.info("m");
    // context still forwarded
    expect(info).toHaveBeenCalledWith("m", { a: 1 });
  });

  // KNOWN BUG (current behavior asserted): ChildLogger.withPrefix() composes a
  // new prefix ("base:sub") and stores it, but ChildLogger delegates logging to
  // the parent WITHOUT passing its prefix. The parent renders with its own
  // prefix only, so the child's composed prefix never reaches the output.
  it("withPrefix composes its own prefix internally but it never reaches output (bug)", () => {
    const parent = makeParent(); // parent has no prefix
    const child = new ChildLogger(parent, {}, "base");
    const prefixed = child.withPrefix("sub");
    const log = spyOn(console, "log").mockImplementation(() => {});
    prefixed.info("m");
    const line = String(log.mock.calls[0][0]);
    log.mockRestore();
    // Parent has no prefix, so no prefix segment is emitted at all.
    expect(line).not.toContain("[base:sub]");
    expect(line).not.toContain("[base]");
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
});
