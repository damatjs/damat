import { describe, it, expect, spyOn } from "bun:test";
import {
  registerShutdown,
  runShutdownHandlers,
  setupShutdownHandlers,
} from "../shutdown";

// setupShutdownHandlers/shutdown wire process signals and call process.exit,
// so tests exercise the extracted handler-draining logic directly.

function recordingLogger() {
  const calls: Array<{ level: string; msg: string; err?: unknown }> = [];
  return {
    calls,
    logger: {
      info: (msg: string) => calls.push({ level: "info", msg }),
      error: (msg: string, err?: unknown) =>
        calls.push({ level: "error", msg, err }),
      warn: (msg: string) => calls.push({ level: "warn", msg }),
      debug: (msg: string) => calls.push({ level: "debug", msg }),
    },
  };
}

describe("runShutdownHandlers", () => {
  it("runs every handler, logs failures with the handler name, and never throws", async () => {
    const ran: string[] = [];
    registerShutdown({
      name: "ok-first",
      handler: () => {
        ran.push("ok-first");
      },
    });
    registerShutdown({
      name: "broken-db",
      handler: async () => {
        ran.push("broken-db");
        throw new Error("pool already closed");
      },
    });
    registerShutdown({
      name: "throws-non-error",
      handler: () => {
        ran.push("throws-non-error");
        throw "plain string";
      },
    });
    registerShutdown({
      name: "ok-last",
      handler: async () => {
        ran.push("ok-last");
      },
    });

    const { calls, logger } = recordingLogger();
    await runShutdownHandlers(logger as never);

    // Every handler ran despite the failures in the middle.
    expect(ran.sort()).toEqual([
      "broken-db",
      "ok-first",
      "ok-last",
      "throws-non-error",
    ]);

    const errors = calls.filter((c) => c.level === "error");
    expect(errors).toHaveLength(2);
    expect(errors.some((c) => c.msg.includes('"broken-db" failed'))).toBe(true);
    expect(
      errors.some((c) => c.msg.includes('"throws-non-error" failed')),
    ).toBe(true);
    // Non-Error throw is normalized into an Error for the log call.
    const nonError = errors.find((c) => c.msg.includes("throws-non-error"))!;
    expect(nonError.err).toBeInstanceOf(Error);
    expect((nonError.err as Error).message).toBe("plain string");
  });
});

describe("setupShutdownHandlers", () => {
  it("registers signal/error handlers, and the signal path drains handlers then exits 0", async () => {
    // Capture the callbacks instead of installing real process handlers, so a
    // stray signal or uncaught exception in the test run can't call the real
    // process.exit.
    const registered = new Map<string, (...args: unknown[]) => unknown>();
    const onSpy = spyOn(process, "on").mockImplementation(((
      event: string,
      cb: never,
    ) => {
      registered.set(event, cb);
      return process;
    }) as never);
    const exitCodes: unknown[] = [];
    const exitSpy = spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      exitCodes.push(code);
      return undefined as never;
    }) as never);

    try {
      const { calls, logger } = recordingLogger();
      const closable = {
        ...logger,
        close: () => calls.push({ level: "close", msg: "" }),
      };
      setupShutdownHandlers(closable as never);

      expect([...registered.keys()].sort()).toEqual([
        "SIGINT",
        "SIGTERM",
        "uncaughtException",
        "unhandledRejection",
      ]);

      // Signal paths: drain handlers, log, close the logger, exit 0. (The
      // module-global handler list still holds the previous test's handlers —
      // their failures are logged here too, which is fine for this assertion.)
      await registered.get("SIGINT")!();
      await registered.get("SIGTERM")!();
      expect(
        calls.some((c) => c.level === "info" && c.msg === "Received SIGINT"),
      ).toBe(true);
      expect(
        calls.some((c) => c.level === "info" && c.msg === "Received SIGTERM"),
      ).toBe(true);
      expect(
        calls.some((c) => c.level === "info" && c.msg === "Shutdown complete"),
      ).toBe(true);
      expect(calls.some((c) => c.level === "close")).toBe(true);
      expect(exitCodes).toEqual([0, 0]);

      // Crash paths log and exit 1.
      registered.get("uncaughtException")!(new Error("boom"));
      registered.get("unhandledRejection")!("not-an-error");
      expect(
        calls.filter((c) => c.level === "error" && c.msg === "Uncaught"),
      ).toHaveLength(1);
      expect(
        calls.filter((c) => c.level === "error" && c.msg === "Unhandled"),
      ).toHaveLength(1);
      expect(exitCodes).toEqual([0, 0, 1, 1]);
    } finally {
      onSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });
});
