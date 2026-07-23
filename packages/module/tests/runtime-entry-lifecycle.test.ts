import { describe, expect, mock, test } from "bun:test";
import type { RunningModuleApp } from "../src";
import { ModulePortInUseError, runModuleEntry } from "../src";

function running(stop = mock(async () => {})): RunningModuleApp {
  return {
    app: {} as never,
    capabilities: {} as never,
    config: {} as never,
    manifest: { name: "audio-aligner" },
    module: {} as never,
    port: 17662,
    routeBasePath: "/api",
    services: {} as never,
    stop,
  };
}

describe("runModuleEntry lifecycle", () => {
  test("prints readiness and stops once when signaled", async () => {
    const lines: string[] = [];
    const exits: number[] = [];
    const notices: string[] = [];
    const signals = new Map<NodeJS.Signals, () => void>();
    const stop = mock(async () => {});
    await runModuleEntry({
      start: async () => running(stop),
      log: (line) => lines.push(line),
      exit: (code) => void exits.push(code),
      once: (signal, listener) => void signals.set(signal, listener),
      notifyStopping: () => void notices.push("stopping"),
    });
    expect(lines).toEqual([
      '✓ Module "audio-aligner" ready at http://localhost:17662',
      "  Routes mounted under http://localhost:17662/api",
      "  Press Ctrl-C to stop",
    ]);
    signals.get("SIGINT")!();
    signals.get("SIGTERM")!();
    await Bun.sleep(0);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(notices).toEqual(["stopping"]);
    expect(exits).toEqual([0]);
  });

  test("reports port collisions without the generic startup message", async () => {
    const errors: unknown[][] = [];
    const exits: number[] = [];
    await runModuleEntry({
      start: async () => Promise.reject(new ModulePortInUseError(7662)),
      error: (...values) => void errors.push(values),
      exit: (code) => void exits.push(code),
    });
    expect(errors.map(([message]) => message)).toEqual([
      "Port 7662 is already in use.",
      "Use: damat module dev --port <port>",
    ]);
    expect(exits).toEqual([1]);
  });

  test("reports shutdown failures", async () => {
    const errors: unknown[][] = [];
    const exits: number[] = [];
    let signal = () => {};
    await runModuleEntry({
      start: async () => running(mock(async () => Promise.reject("stop"))),
      error: (...values) => void errors.push(values),
      exit: (code) => void exits.push(code),
      once: (_name, listener) => void (signal = listener),
    });
    signal();
    await Bun.sleep(0);
    expect(errors[0]?.[0]).toBe("Failed to stop module:");
    expect(exits).toEqual([1]);
  });

  test("registers the default process signal handlers", async () => {
    const beforeInterrupt = new Set(process.listeners("SIGINT"));
    const beforeTerminate = new Set(process.listeners("SIGTERM"));
    await runModuleEntry({
      start: async () => running(),
      log: () => {},
      exit: () => {},
    });
    const added = process
      .listeners("SIGINT")
      .filter((item) => !beforeInterrupt.has(item));
    expect(added).toHaveLength(1);
    for (const listener of added) process.off("SIGINT", listener);
    for (const listener of process.listeners("SIGTERM")) {
      if (beforeTerminate.has(listener)) continue;
      process.off("SIGTERM", listener);
    }
  });
});
