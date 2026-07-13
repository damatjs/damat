import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { setGlobalLogger, closeLogger } from "@damatjs/logger";
import { EventBus, type EventContext } from "../src/index";

// ---------------------------------------------------------------------------
// Recording logger: the bus logs subscriber/broadcaster failures through the
// global logger, so swap in a fake that records error calls and restore it
// after every test.
// ---------------------------------------------------------------------------
const errorCalls: Array<{ message: string; error?: unknown }> = [];

const recordingLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: (message: string, error?: unknown) => {
    errorCalls.push({ message, error });
  },
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
};

beforeEach(() => {
  errorCalls.length = 0;
  setGlobalLogger(recordingLogger as never);
});

afterEach(() => {
  closeLogger();
});

describe("EventBus — on/emit", () => {
  it("delivers the payload and a local context to a subscriber", async () => {
    const bus = new EventBus();
    const received: Array<{ payload: unknown; context: EventContext }> = [];
    bus.on("user.created", (payload, context) => {
      received.push({ payload, context });
    });

    const before = Date.now();
    const delivered = await bus.emit("user.created", { id: 1 });

    expect(delivered).toBe(1);
    expect(received).toHaveLength(1);
    expect(received[0]!.payload).toEqual({ id: 1 });
    expect(received[0]!.context.event).toBe("user.created");
    expect(received[0]!.context.source).toBe("local");
    expect(received[0]!.context.emittedAt).toBeInstanceOf(Date);
    expect(received[0]!.context.emittedAt.getTime()).toBeGreaterThanOrEqual(
      before,
    );
  });

  it("calls multiple handlers in subscription order", async () => {
    const bus = new EventBus();
    const order: string[] = [];
    bus.on("evt", () => {
      order.push("first");
    });
    bus.on("evt", () => {
      order.push("second");
    });
    bus.on("evt", () => {
      order.push("third");
    });

    const delivered = await bus.emit("evt", null);

    expect(delivered).toBe(3);
    expect(order).toEqual(["first", "second", "third"]);
  });

  it("awaits async handlers before emit resolves", async () => {
    const bus = new EventBus();
    let settled = false;
    bus.on("evt", async () => {
      await new Promise((r) => setTimeout(r, 10));
      settled = true;
    });

    await bus.emit("evt", null);

    expect(settled).toBe(true);
  });

  it("logs a rejecting handler without blocking others or throwing at the emitter", async () => {
    const bus = new EventBus();
    const boom = new Error("subscriber down");
    const order: string[] = [];
    bus.on("evt", async () => {
      order.push("failing");
      throw boom;
    });
    bus.on("evt", () => {
      order.push("healthy");
    });

    // emit resolves (never throws) and still counts both handlers.
    const delivered = await bus.emit("evt", null);

    expect(delivered).toBe(2);
    expect(order).toEqual(["failing", "healthy"]);
    expect(errorCalls).toHaveLength(1);
    expect(errorCalls[0]!.message).toBe('Event subscriber for "evt" failed');
    expect(errorCalls[0]!.error).toBe(boom);
  });

  it("wraps a non-Error rejection reason in an Error when logging", async () => {
    const bus = new EventBus();
    bus.on("evt", () => Promise.reject("plain string reason"));

    await bus.emit("evt", null);

    expect(errorCalls).toHaveLength(1);
    expect(errorCalls[0]!.error).toBeInstanceOf(Error);
    expect((errorCalls[0]!.error as Error).message).toBe("plain string reason");
  });

  it("returns 0 when nothing is subscribed", async () => {
    const bus = new EventBus();
    expect(await bus.emit("nobody.cares", { x: 1 })).toBe(0);
  });
});

describe("EventBus — once", () => {
  it("fires exactly once", async () => {
    const bus = new EventBus();
    let calls = 0;
    bus.once("evt", () => {
      calls++;
    });

    await bus.emit("evt", null);
    await bus.emit("evt", null);

    expect(calls).toBe(1);
    expect(bus.listenerCount("evt")).toBe(0);
  });

  it("awaits the wrapped handler", async () => {
    const bus = new EventBus();
    let settled = false;
    bus.once("evt", async () => {
      await new Promise((r) => setTimeout(r, 10));
      settled = true;
    });

    await bus.emit("evt", null);

    expect(settled).toBe(true);
  });

  it("its unsubscribe works before the event ever fires", async () => {
    const bus = new EventBus();
    let calls = 0;
    const unsubscribe = bus.once("evt", () => {
      calls++;
    });

    unsubscribe();
    await bus.emit("evt", null);

    expect(calls).toBe(0);
    expect(bus.listenerCount("evt")).toBe(0);
  });
});

describe("EventBus — off / unsubscribe / removeAllListeners", () => {
  it("off() detaches a subscribed handler", async () => {
    const bus = new EventBus();
    let calls = 0;
    const handler = () => {
      calls++;
    };
    bus.on("evt", handler);
    bus.off("evt", handler);

    await bus.emit("evt", null);

    expect(calls).toBe(0);
  });

  it("off() for an event with no subscribers is a no-op", () => {
    const bus = new EventBus();
    expect(() => bus.off("never.subscribed", () => {})).not.toThrow();
  });

  it("the Unsubscribe returned by on() detaches only that handler", async () => {
    const bus = new EventBus();
    const order: string[] = [];
    const unsubscribe = bus.on("evt", () => {
      order.push("first");
    });
    bus.on("evt", () => {
      order.push("second");
    });

    unsubscribe();
    await bus.emit("evt", null);

    expect(order).toEqual(["second"]);
  });

  it("removeAllListeners(event) drops that event's handlers only", async () => {
    const bus = new EventBus();
    let aCalls = 0;
    let bCalls = 0;
    bus.on("a", () => {
      aCalls++;
    });
    bus.on("b", () => {
      bCalls++;
    });

    bus.removeAllListeners("a");
    await bus.emit("a", null);
    await bus.emit("b", null);

    expect(aCalls).toBe(0);
    expect(bCalls).toBe(1);
  });

  it("removeAllListeners() drops everything, including wildcards", async () => {
    const bus = new EventBus();
    let calls = 0;
    bus.on("a", () => {
      calls++;
    });
    bus.on("*", () => {
      calls++;
    });

    bus.removeAllListeners();
    await bus.emit("a", null);

    expect(calls).toBe(0);
    expect(bus.listenerCount("a")).toBe(0);
  });
});

describe("EventBus — listenerCount and wildcard", () => {
  it("listenerCount counts direct plus '*' subscribers", () => {
    const bus = new EventBus();
    bus.on("evt", () => {});
    bus.on("evt", () => {});
    bus.on("*", () => {});

    expect(bus.listenerCount("evt")).toBe(3);
    expect(bus.listenerCount("other")).toBe(1); // wildcard only
  });

  it("'*' receives every event with the real event name in context", async () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.on("*", (_payload, context) => {
      seen.push(context.event);
    });

    await bus.emit("user.created", { id: 1 });
    await bus.emit("invoice.paid", { id: 2 });

    expect(seen).toEqual(["user.created", "invoice.paid"]);
  });

  it("emit('*') delivers to '*' subscribers exactly once (no double delivery)", async () => {
    const bus = new EventBus();
    let calls = 0;
    bus.on("*", () => {
      calls++;
    });

    const delivered = await bus.emit("*", null);

    expect(delivered).toBe(1);
    expect(calls).toBe(1);
  });
});

describe("EventBus — dispatch", () => {
  it("passes a remote source through to subscribers", async () => {
    const bus = new EventBus();
    const sources: string[] = [];
    bus.on("evt", (_payload, context) => {
      sources.push(context.source);
    });

    const delivered = await bus.dispatch("evt", { remote: true }, "remote");

    expect(delivered).toBe(1);
    expect(sources).toEqual(["remote"]);
  });
});

describe("EventBus — broadcaster", () => {
  it("broadcasting reflects whether a transport is attached", () => {
    const bus = new EventBus();
    expect(bus.broadcasting).toBe(false);
    bus.setBroadcaster(async () => {});
    expect(bus.broadcasting).toBe(true);
    bus.setBroadcaster(null);
    expect(bus.broadcasting).toBe(false);
  });

  it("publishes via the broadcaster AFTER local delivery", async () => {
    const bus = new EventBus();
    const order: string[] = [];
    const broadcasts: Array<{ event: string; payload: unknown }> = [];
    bus.on("evt", () => {
      order.push("local");
    });
    bus.setBroadcaster(async (event, payload) => {
      order.push("broadcast");
      broadcasts.push({ event, payload });
    });

    const delivered = await bus.emit("evt", { id: 7 });

    expect(delivered).toBe(1);
    expect(order).toEqual(["local", "broadcast"]);
    expect(broadcasts).toEqual([{ event: "evt", payload: { id: 7 } }]);
  });

  it("logs a throwing broadcaster and still resolves emit", async () => {
    const bus = new EventBus();
    const boom = new Error("redis down");
    let localRan = false;
    bus.on("evt", () => {
      localRan = true;
    });
    bus.setBroadcaster(async () => {
      throw boom;
    });

    const delivered = await bus.emit("evt", null);

    expect(delivered).toBe(1);
    expect(localRan).toBe(true);
    expect(errorCalls).toHaveLength(1);
    expect(errorCalls[0]!.message).toBe(
      'Event broadcast failed for "evt" — local subscribers already ran',
    );
    expect(errorCalls[0]!.error).toBe(boom);
  });

  it("wraps a non-Error broadcaster failure in an Error when logging", async () => {
    const bus = new EventBus();
    bus.setBroadcaster(() => Promise.reject("transport string failure"));

    await bus.emit("evt", null);

    expect(errorCalls).toHaveLength(1);
    expect(errorCalls[0]!.error).toBeInstanceOf(Error);
    expect((errorCalls[0]!.error as Error).message).toBe(
      "transport string failure",
    );
  });
});
