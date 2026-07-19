import { getLogger } from "@damatjs/logger";
import { EVENT_WAKEUP_CHANNEL } from "./publisher";
import type {
  EventWakeup,
  EventWakeupConnection,
  EventWakeupRedis,
  StopEventWakeupSubscriber,
} from "./types";

export async function startEventWakeupSubscriber(
  redis: EventWakeupRedis,
  wake: (message: EventWakeup) => void,
): Promise<StopEventWakeupSubscriber> {
  let connection: EventWakeupConnection | undefined;
  const onError = (error: Error) => {
    getLogger().warn("Durable event wake-up Redis error", {
      error: error.message,
    });
  };
  try {
    connection = redis.duplicate();
    const active = connection;
    const listener = (channel: string, message: string) => {
      if (channel !== EVENT_WAKEUP_CHANNEL) return;
      const parsed = parseEventWakeup(message);
      if (parsed) wake(parsed);
    };
    active.on("message", listener);
    active.on("error", onError);
    await active.subscribe(EVENT_WAKEUP_CHANNEL);
    return async () => {
      active.off("message", listener);
      await active.unsubscribe(EVENT_WAKEUP_CHANNEL).catch(() => {});
      await active.quit().catch(() => {});
      active.off("error", onError);
    };
  } catch (error) {
    getLogger().warn("Durable event wake-up subscription failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    await connection?.quit().catch(() => {});
    connection?.off("error", onError);
    return async () => {};
  }
}

export function parseEventWakeup(message: string): EventWakeup | undefined {
  try {
    const value = JSON.parse(message) as Record<string, unknown>;
    if (value.kind !== "events") return undefined;
    if (value.target === "router" && Object.keys(value).length === 2) {
      return { kind: "events", target: "router" };
    }
    if (
      value.target !== "delivery" ||
      Object.keys(value).length !== 4 ||
      typeof value.event !== "string" ||
      !value.event.trim() ||
      typeof value.consumer !== "string" ||
      !value.consumer.trim()
    ) {
      return undefined;
    }
    return {
      kind: "events",
      target: "delivery",
      event: value.event,
      consumer: value.consumer,
    };
  } catch {
    return undefined;
  }
}
