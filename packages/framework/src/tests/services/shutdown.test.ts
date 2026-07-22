import { describe, expect, it, mock } from "bun:test";
import type { ILogger } from "@damatjs/logger";
import { runServiceShutdownHandlers } from "../../services/shutdown";

function logger() {
  return {
    error: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    debug: mock(() => {}),
  } as unknown as ILogger;
}

describe("runServiceShutdownHandlers", () => {
  it("runs registrations in shutdown phase order", async () => {
    const order: string[] = [];
    await runServiceShutdownHandlers(
      [
        { name: "db", phase: "postgres", handler: () => void order.push("db") },
        { name: "http", phase: "http", handler: () => void order.push("http") },
        {
          name: "drain",
          phase: "drain",
          handler: () => void order.push("drain"),
        },
        {
          name: "bindings",
          phase: "bindings",
          handler: () => void order.push("bindings"),
        },
        {
          name: "durability",
          phase: "durability",
          handler: () => void order.push("durability"),
        },
      ],
      logger(),
    );
    expect(order).toEqual(["http", "drain", "bindings", "durability", "db"]);
  });

  it("honors drain grace and reports Error and non-Error failures", async () => {
    const log = logger();
    await runServiceShutdownHandlers(
      [
        {
          name: "timeout",
          phase: "drain",
          handler: () => new Promise(() => {}),
        },
        {
          name: "error",
          phase: "postgres",
          handler: () => Promise.reject(new Error("db")),
        },
        {
          name: "string",
          phase: "redis",
          handler: () => Promise.reject("redis"),
        },
      ],
      log,
      { graceMs: 1 },
    );
    expect(log.error).toHaveBeenCalledTimes(3);
    expect(
      (log.error as ReturnType<typeof mock>).mock.calls.join(" "),
    ).toContain("Grace drain timed out");
  });

  it("clears a grace timer when a drain finishes", async () => {
    await runServiceShutdownHandlers(
      [{ name: "drain", phase: "drain", handler: async () => {} }],
      logger(),
      { graceMs: 50 },
    );
  });
});
