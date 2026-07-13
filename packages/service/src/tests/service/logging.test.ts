import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { setGlobalLogger, closeLogger, type ILogger } from "@damatjs/logger";
import { withQueryLogging } from "../../service/logging";
import type { ModelMethods } from "../../service/methods";

const debugCalls: Array<{
  message: string;
  context?: Record<string, unknown>;
}> = [];

const recordingLogger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    debugCalls.push({ message, context }),
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  waiting: () => {},
  progress: () => {},
  cached: () => {},
  success: () => {},
  skip: () => {},
  child: () => recordingLogger,
  withPrefix: () => recordingLogger,
  request: () => {},
  close: () => {},
} as unknown as ILogger;

beforeEach(() => {
  debugCalls.length = 0;
  setGlobalLogger(recordingLogger as never);
});

afterEach(() => {
  closeLogger();
});

/** A stub with the shape withQueryLogging cares about. */
function makeStub() {
  return {
    calls: [] as string[],
    async findMany(options: unknown) {
      this.calls.push("findMany");
      return [{ id: 1, options }];
    },
    async create() {
      this.calls.push("create");
      throw new Error("insert failed");
    },
    setTransactionalEm(_tx: unknown) {
      this.calls.push("setTransactionalEm");
    },
    notAFunction: 42,
  };
}

describe("withQueryLogging", () => {
  it("logs one debug 'query' entry per CRUD call with model/method/duration", async () => {
    const stub = makeStub();
    const wrapped = withQueryLogging(stub as unknown as ModelMethods, "user");

    const rows = await (wrapped as unknown as typeof stub).findMany({
      where: {},
    });

    expect(rows).toHaveLength(1);
    expect(stub.calls).toEqual(["findMany"]);
    expect(debugCalls).toHaveLength(1);
    expect(debugCalls[0]!.message).toBe("query");
    expect(debugCalls[0]!.context).toMatchObject({
      model: "user",
      method: "findMany",
    });
    expect(typeof debugCalls[0]!.context!.durationMs).toBe("number");
    // No SQL or option payloads in the log context.
    expect(Object.keys(debugCalls[0]!.context!).sort()).toEqual([
      "durationMs",
      "method",
      "model",
    ]);
  });

  it("still logs (and rethrows) when the underlying call fails", async () => {
    const stub = makeStub();
    const wrapped = withQueryLogging(stub as unknown as ModelMethods, "user");

    await expect((wrapped as unknown as typeof stub).create()).rejects.toThrow(
      "insert failed",
    );
    expect(debugCalls).toHaveLength(1);
    expect(debugCalls[0]!.context).toMatchObject({
      model: "user",
      method: "create",
    });
  });

  it("leaves non-CRUD members untouched", async () => {
    const stub = makeStub();
    const wrapped = withQueryLogging(stub as unknown as ModelMethods, "user");

    (wrapped as unknown as typeof stub).setTransactionalEm(null);
    expect((wrapped as unknown as typeof stub).notAFunction).toBe(42);
    expect(debugCalls).toHaveLength(0);
  });
});
