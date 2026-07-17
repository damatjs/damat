import { beforeEach, expect, test } from "bun:test";
import { startServer } from "../../server";
import {
  registerShutdown,
  resetShutdownRegistry,
  runShutdownHandlers,
  type ShutdownPhase,
} from "../../shutdown";

const [calls, errors]: string[][] = [[], []];
const logger = {
  info: (message: string) => calls.push(message),
  error: (message: string) => errors.push(message),
};
const record = (name: string, phase: ShutdownPhase) =>
  registerShutdown({ name, phase, handler: () => calls.push(name) });
beforeEach(() => {
  calls.length = errors.length = 0;
  resetShutdownRegistry();
});
test("orders phases, settles peers, and continues after failures", async () => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => (release = resolve));
  record("http", "http");
  registerShutdown({
    name: "claims-a",
    phase: "claims",
    handler: async () => {
      calls.push("claims-a");
      await blocked;
      throw new Error("broken");
    },
  });
  registerShutdown({
    name: "claims-b",
    phase: "claims",
    handler: () => {
      calls.push("claims-b");
      release();
    },
  });
  for (const phase of ["drain", "heartbeat", "redis", "logger"] as const) {
    record(phase, phase);
  }
  record("db", "postgres");
  await runShutdownHandlers(logger as never);
  expect(calls.join(">")).toBe(
    "http>claims-a>claims-b>drain>heartbeat>redis>db>Shutdown complete>logger",
  );
  expect(errors[0]).toContain('"claims-a" failed in phase "claims"');
});

test("times out grace drains without touching their leases", async () => {
  registerShutdown({
    name: "lease",
    phase: "drain",
    handler: () => new Promise(() => {}),
  });
  record("heartbeat", "heartbeat");
  await runShutdownHandlers(logger as never, { graceMs: 1 });
  expect(calls).toEqual(["heartbeat", "Shutdown complete"]);
  expect(errors[0]).toContain("timed out after 1ms");
});

test("startServer returns an idempotent promise close handle", async () => {
  let closeCalls = 0,
    listening = () => {};
  const server = {
    listening: false,
    once(event: string, callback: () => void) {
      if (event === "listening") listening = callback;
      return this;
    },
    off() {
      return this;
    },
    close(callback: (error?: Error) => void) {
      closeCalls++;
      callback();
    },
  };
  const adapter = (
    _options: unknown,
    ready: (info: { port: number }) => void,
  ) => {
    ready({ port: 7777 });
    return server;
  };
  const handle = startServer(
    { fetch: () => new Response() } as never,
    { port: 7777 },
    logger as never,
    adapter as never,
  );
  const closing = handle.close();
  expect(handle.close()).toBe(closing);
  listening();
  await closing;
  expect(closeCalls).toBe(1);
});
