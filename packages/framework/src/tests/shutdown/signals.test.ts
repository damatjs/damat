import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import {
  registerShutdown,
  resetShutdownRegistry,
  resetShutdownSignalsForTests,
  setupShutdownHandlers,
} from "../../shutdown";

const callbacks = new Map<string, (...args: unknown[]) => unknown>();
const exits: number[] = [];
const logs: string[] = [];
const logger = {
  info: (message: string) => logs.push(message),
  error: (message: string) => logs.push(message),
};
let onSpy: ReturnType<typeof spyOn>;
let exitSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  callbacks.clear();
  exits.length = 0;
  logs.length = 0;
  resetShutdownRegistry();
  resetShutdownSignalsForTests();
  onSpy = spyOn(process, "on").mockImplementation(((
    event: string,
    callback: never,
  ) => {
    callbacks.set(event, callback);
    return process;
  }) as never);
  exitSpy = spyOn(process, "exit").mockImplementation(((code?: number) => {
    exits.push(code ?? 0);
    return undefined as never;
  }) as never);
});

afterEach(() => {
  onSpy.mockRestore();
  exitSpy.mockRestore();
});

test("installs listeners once and ignores shutdown re-entry", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => (release = resolve));
  let runs = 0;
  registerShutdown({
    name: "http",
    phase: "http",
    handler: async () => {
      runs++;
      await blocked;
    },
  });
  setupShutdownHandlers(logger as never);
  setupShutdownHandlers(logger as never);

  expect(onSpy).toHaveBeenCalledTimes(4);
  const first = callbacks.get("SIGINT")!();
  const second = callbacks.get("SIGTERM")!();
  release();
  await Promise.all([first, second]);

  expect(runs).toBe(1);
  expect(exits).toEqual([0]);
  expect(
    logs.filter((message) => message === "Shutdown complete"),
  ).toHaveLength(1);
});

test("fatal process errors log and exit one", () => {
  setupShutdownHandlers(logger as never);
  callbacks.get("uncaughtException")!(new Error("boom"));
  callbacks.get("unhandledRejection")!("reason");
  expect(logs).toContain("Uncaught");
  expect(logs).toContain("Unhandled");
  expect(exits).toEqual([1, 1]);
});
