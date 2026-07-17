import { getDurabilityClient } from "@damatjs/durability";
import { claimUnroutedEvents } from "./claim";
import { completeEventRouting } from "./complete";
import { fanOutEvent } from "./fanout";
import type { RouteDurableEventsOptions } from "./types";
import { publishEventConsumerWakeup } from "../wakeup/publisher";

export async function routeDurableEvents(
  options: RouteDurableEventsOptions = {},
): Promise<number> {
  const limit = options.limit ?? 100;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000) {
    throw new Error("route limit must be an integer between 1 and 1000");
  }
  const client = options.client ?? getDurabilityClient();
  const routed = await client.transaction(async (executor) => {
    const events = await claimUnroutedEvents(executor, limit);
    const identities: Array<{ event: string; consumer: string }> = [];
    for (const event of events) {
      const consumers = await fanOutEvent(executor, event);
      await completeEventRouting(executor, event, consumers);
      identities.push(
        ...consumers.map((consumer) => ({
          event: event.name,
          consumer,
        })),
      );
    }
    return { count: events.length, identities };
  });
  for (const identity of routed.identities) {
    await publishEventConsumerWakeup(identity.event, identity.consumer);
  }
  return routed.count;
}
