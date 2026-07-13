import { describe, it, expect, afterEach } from "bun:test";
import { EventBus, getEventBus, setEventBus, resetEventBus } from "../src/index";

// The bus lives on globalThis, so always leave a clean slate for other suites.
afterEach(() => {
  resetEventBus();
});

describe("global event bus", () => {
  it("getEventBus returns the same instance on every call", () => {
    const first = getEventBus();
    const second = getEventBus();
    expect(first).toBeInstanceOf(EventBus);
    expect(second).toBe(first);
  });

  it("setEventBus swaps the global instance", () => {
    const original = getEventBus();
    const replacement = new EventBus();

    setEventBus(replacement);

    expect(getEventBus()).toBe(replacement);
    expect(getEventBus()).not.toBe(original);
  });

  it("resetEventBus drops the bus and its subscriptions", async () => {
    const before = getEventBus();
    let calls = 0;
    before.on("evt", () => {
      calls++;
    });

    resetEventBus();

    const after = getEventBus();
    expect(after).not.toBe(before);
    // The fresh instance has none of the old subscriptions.
    expect(after.listenerCount("evt")).toBe(0);
    expect(await after.emit("evt", null)).toBe(0);
    expect(calls).toBe(0);
  });
});
