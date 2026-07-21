import { getLogger } from "@damatjs/logger";
import type { EventWakeup, EventWakeupPublisher } from "./types";

export const EVENT_WAKEUP_CHANNEL = "damat:events:wakeup";
const PUBLISHER = Symbol.for("damatjs.events.wakeupPublisher");
type WakeupGlobal = typeof globalThis & { [PUBLISHER]?: EventWakeupPublisher };
const storage = globalThis as WakeupGlobal;

export function configureEventWakeupPublisher(
  publisher: EventWakeupPublisher,
): void {
  storage[PUBLISHER] = publisher;
}

export function clearEventWakeupPublisher(): void {
  delete storage[PUBLISHER];
}

export const publishEventRouterWakeup = () =>
  publishEventWakeup({ kind: "events", target: "router" });

export const publishEventConsumerWakeup = (event: string, consumer: string) =>
  publishEventWakeup({ kind: "events", target: "delivery", event, consumer });

async function publishEventWakeup(message: EventWakeup): Promise<boolean> {
  const publisher = storage[PUBLISHER];
  if (!publisher) return false;
  try {
    await publisher.publish(EVENT_WAKEUP_CHANNEL, JSON.stringify(message));
    return true;
  } catch (error) {
    getLogger().warn("Durable event wake-up publication failed", {
      message,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
