import {
  defineDurableEventHandler,
  DurableEventRouter,
  DurableEventWorker,
  getDurableEventDelivery,
  listDurableEventDeliveryAttempts,
  listDurableEventLogs,
  publishDurableEvent,
  type DurableEventDelivery,
  type DurableEventDeliveryAttempt,
  type DurableEventLog,
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
    void payload.wrong;
  },
);
// @ts-expect-error registered payloads reject missing fields
void publishDurableEvent("typed.created", { wrong: true });
type Payload = DurableEventPayload<"typed.created">;
const payload: Payload = { id: "a1" };
void payload;
void eventsSystemMigrations;

const router = new DurableEventRouter({ batchSize: 10 });
const worker = new DurableEventWorker({
  consumers: [{ event: "typed.created", consumer: "typed-consumer" }],
});
router.start();
worker.start();
void router.stop();
void worker.stop({ graceMs: 1_000 });

const delivery: Promise<DurableEventDelivery | undefined> =
  getDurableEventDelivery("id");
const attempts: Promise<DurableEventDeliveryAttempt[]> =
  listDurableEventDeliveryAttempts("id");
const logs: Promise<DurableEventLog[]> = listDurableEventLogs("id");
void delivery;
void attempts;
void logs;
