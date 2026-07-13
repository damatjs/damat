import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { setGlobalLogger, closeLogger } from "@damatjs/logger";

// ---------------------------------------------------------------------------
// Mock the redis boundary. The transport only needs the singleton client (as
// publisher) and a duplicate of it (as subscriber); both are controllable
// recording fakes so no Redis server is involved.
// ---------------------------------------------------------------------------
type MessageHandler = (channel: string, raw: string) => void;

const fakeSubscriber = {
  subscribeCalls: [] as string[],
  unsubscribeCalls: [] as string[],
  quitCalls: 0,
  quitThrows: false,
  messageHandlers: [] as MessageHandler[],
  async subscribe(channel: string) {
    this.subscribeCalls.push(channel);
    return 1;
  },
  on(event: string, handler: MessageHandler) {
    if (event === "message") this.messageHandlers.push(handler);
    return this;
  },
  async unsubscribe(channel: string) {
    this.unsubscribeCalls.push(channel);
    return 0;
  },
  async quit() {
    this.quitCalls++;
    if (this.quitThrows) throw new Error("quit failed");
    return "OK";
  },
};

const fakePublisher = {
  publishCalls: [] as Array<{ channel: string; message: string }>,
  duplicateCalls: 0,
  async publish(channel: string, message: string) {
    this.publishCalls.push({ channel, message });
    return 0;
  },
  duplicate() {
    this.duplicateCalls++;
    return fakeSubscriber;
  },
};

mock.module("@damatjs/redis", () => ({
  getRedisClient: () => ({ client: fakePublisher }),
}));

const {
  connectEventBroadcast,
  disconnectEventBroadcast,
  isEventBroadcastConnected,
  getEventBus,
  resetEventBus,
} = await import("../src/index");

// ---------------------------------------------------------------------------
// Recording logger for the transport's info/warn/debug lines.
// ---------------------------------------------------------------------------
const logCalls: Array<{ level: string; message: string }> = [];
const record = (level: string) => (message: string) => {
  logCalls.push({ level, message });
};
const recordingLogger = {
  debug: record("debug"),
  info: record("info"),
  warn: record("warn"),
  error: record("error"),
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

/** Deliver a raw pub/sub message to every registered "message" handler. */
function deliver(raw: string, channel = "damat-events") {
  for (const handler of fakeSubscriber.messageHandlers) handler(channel, raw);
}

/** The envelope emit() published last (to learn our own instanceId). */
function lastEnvelope(): {
  instanceId: string;
  event: string;
  payload: unknown;
  emittedAt: string;
} {
  const call = fakePublisher.publishCalls.at(-1);
  if (!call) throw new Error("nothing was published");
  return JSON.parse(call.message);
}

const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  logCalls.length = 0;
  fakeSubscriber.subscribeCalls.length = 0;
  fakeSubscriber.unsubscribeCalls.length = 0;
  fakeSubscriber.quitCalls = 0;
  fakeSubscriber.quitThrows = false;
  fakeSubscriber.messageHandlers.length = 0;
  fakePublisher.publishCalls.length = 0;
  fakePublisher.duplicateCalls = 0;
  resetEventBus();
  setGlobalLogger(recordingLogger as never);
});

afterEach(async () => {
  fakeSubscriber.quitThrows = false;
  await disconnectEventBroadcast();
  resetEventBus();
  closeLogger();
});

describe("connectEventBroadcast", () => {
  it("subscribes to the default channel and attaches the bus broadcaster", async () => {
    expect(isEventBroadcastConnected()).toBe(false);

    await connectEventBroadcast();

    expect(fakeSubscriber.subscribeCalls).toEqual(["damat-events"]);
    expect(fakePublisher.duplicateCalls).toBe(1);
    expect(getEventBus().broadcasting).toBe(true);
    expect(isEventBroadcastConnected()).toBe(true);
    expect(logCalls).toContainEqual({
      level: "info",
      message: "Event broadcast connected",
    });
  });

  it("subscribes to a custom channel and publishes there", async () => {
    await connectEventBroadcast({ channel: "my-app-events" });

    expect(fakeSubscriber.subscribeCalls).toEqual(["my-app-events"]);

    await getEventBus().emit("evt", { id: 1 });
    expect(fakePublisher.publishCalls).toHaveLength(1);
    expect(fakePublisher.publishCalls[0]!.channel).toBe("my-app-events");
  });

  it("emit publishes a JSON envelope with instanceId/event/payload/emittedAt", async () => {
    await connectEventBroadcast();

    await getEventBus().emit("user.created", { id: 42 });

    expect(fakePublisher.publishCalls).toHaveLength(1);
    expect(fakePublisher.publishCalls[0]!.channel).toBe("damat-events");
    const envelope = lastEnvelope();
    expect(typeof envelope.instanceId).toBe("string");
    expect(envelope.instanceId.length).toBeGreaterThan(0);
    expect(envelope.event).toBe("user.created");
    expect(envelope.payload).toEqual({ id: 42 });
    expect(new Date(envelope.emittedAt).getTime()).not.toBeNaN();
  });

  it("is idempotent: a second connect neither re-subscribes nor re-duplicates", async () => {
    await connectEventBroadcast();
    await connectEventBroadcast({ channel: "ignored-second-channel" });

    expect(fakeSubscriber.subscribeCalls).toEqual(["damat-events"]);
    expect(fakePublisher.duplicateCalls).toBe(1);
  });
});

describe("incoming broadcast messages", () => {
  it("dispatches a FOREIGN instance's message to the bus with source 'remote'", async () => {
    await connectEventBroadcast();

    const received: Array<{ payload: unknown; source: string }> = [];
    getEventBus().on("user.created", (payload, context) => {
      received.push({ payload, source: context.source });
    });

    deliver(
      JSON.stringify({
        instanceId: "some-other-process",
        event: "user.created",
        payload: { id: 7 },
        emittedAt: new Date().toISOString(),
      }),
    );
    await tick(); // dispatch is fire-and-forget

    expect(received).toEqual([{ payload: { id: 7 }, source: "remote" }]);
  });

  it("ignores SELF messages so local emits are not double-delivered", async () => {
    await connectEventBroadcast();

    let deliveries = 0;
    getEventBus().on("evt", () => {
      deliveries++;
    });

    // A local emit delivers once and publishes the envelope…
    await getEventBus().emit("evt", { n: 1 });
    expect(deliveries).toBe(1);

    // …and Redis echoing that same envelope back must NOT deliver again.
    deliver(fakePublisher.publishCalls[0]!.message);
    await tick();
    expect(deliveries).toBe(1);

    // Sanity: the skipped envelope really carried our own instanceId.
    const foreign = { ...lastEnvelope(), instanceId: "someone-else" };
    deliver(JSON.stringify(foreign));
    await tick();
    expect(deliveries).toBe(2);
  });

  it("warns and drops malformed JSON without throwing", async () => {
    await connectEventBroadcast();

    let deliveries = 0;
    getEventBus().on("*", () => {
      deliveries++;
    });

    expect(() => deliver("{not json")).not.toThrow();
    await tick();

    expect(deliveries).toBe(0);
    expect(logCalls).toContainEqual({
      level: "warn",
      message: "Dropped malformed event broadcast message",
    });
  });
});

describe("disconnectEventBroadcast", () => {
  it("unsubscribes, quits, and clears the broadcaster", async () => {
    await connectEventBroadcast({ channel: "chan" });
    expect(isEventBroadcastConnected()).toBe(true);

    await disconnectEventBroadcast();

    expect(fakeSubscriber.unsubscribeCalls).toEqual(["chan"]);
    expect(fakeSubscriber.quitCalls).toBe(1);
    expect(getEventBus().broadcasting).toBe(false);
    expect(isEventBroadcastConnected()).toBe(false);

    // Emits after disconnect stay local — nothing is published.
    await getEventBus().emit("evt", null);
    expect(fakePublisher.publishCalls).toHaveLength(0);
  });

  it("is a no-op when not connected", async () => {
    await disconnectEventBroadcast();

    expect(fakeSubscriber.unsubscribeCalls).toHaveLength(0);
    expect(fakeSubscriber.quitCalls).toBe(0);
  });

  it("only debug-logs when the subscriber close fails, and still disconnects", async () => {
    await connectEventBroadcast();
    fakeSubscriber.quitThrows = true;

    await disconnectEventBroadcast();

    expect(isEventBroadcastConnected()).toBe(false);
    expect(getEventBus().broadcasting).toBe(false);
    expect(logCalls).toContainEqual({
      level: "debug",
      message: "Event broadcast subscriber close failed: quit failed",
    });
    // A fresh connect works after the failed close.
    await connectEventBroadcast();
    expect(isEventBroadcastConnected()).toBe(true);
  });
});
