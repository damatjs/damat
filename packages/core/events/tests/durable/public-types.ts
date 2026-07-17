import {
  defineDurableEventHandler,
  publishDurableEvent,
  type DurableEventPayload,
} from "@damatjs/events";
import { eventsSystemMigrations } from "@damatjs/events/migrations";

declare module "@damatjs/events" {
  interface DurableEventMap {
    "typed.created": { id: string };
  }
}

void publishDurableEvent("typed.created", { id: "a1" });
defineDurableEventHandler(
  "typed.created",
  "typed-consumer",
  async (payload) => {
    payload.id.toUpperCase();
    // @ts-expect-error registered handler payloads reject unknown fields
    payload.wrong;
  },
);
// @ts-expect-error registered payloads reject missing fields
void publishDurableEvent("typed.created", { wrong: true });
type Payload = DurableEventPayload<"typed.created">;
const payload: Payload = { id: "a1" };
void payload;
void eventsSystemMigrations;
