import {
  getDurabilityClient,
  isTransactionalExecutor,
  TransactionalExecutorRequiredError,
  type DurabilityExecutor,
} from "@damatjs/durability";
import type {
  DurableEventName,
  DurableEventPayload,
  PublishDurableEventOptions,
} from "../definitions/types";
import {
  appendDurableEventActivity,
  findIdempotentEvent,
  insertDurableEvent,
  type DurableEventRecord,
  type NewDurableEvent,
} from "../repositories";
import { resolveDurableEvent } from "./resolve";
import { publishEventRouterWakeup } from "../wakeup/publisher";

export async function publishDurableEvent<K extends DurableEventName>(
  name: K,
  payload: DurableEventPayload<K>,
  options: PublishDurableEventOptions = {},
): Promise<DurableEventRecord> {
  const event = resolveDurableEvent(name, payload, options);
  if (options.executor) {
    if (!isTransactionalExecutor(options.executor)) {
      throw new TransactionalExecutorRequiredError();
    }
    return publishWith(options.executor, event);
  }
  const published = await getDurabilityClient().transaction((executor) =>
    publishWith(executor, event),
  );
  await publishEventRouterWakeup();
  return published;
}

async function publishWith(
  executor: DurabilityExecutor,
  event: NewDurableEvent,
): Promise<DurableEventRecord> {
  const inserted = await insertDurableEvent(executor, event);
  if (inserted) {
    await appendDurableEventActivity(executor, inserted.id, "published");
    return inserted;
  }
  const existing = event.idempotencyKey
    ? await findIdempotentEvent(executor, event.name, event.idempotencyKey)
    : undefined;
  if (!existing)
    throw new Error("Durable event idempotency conflict has no event");
  return existing;
}
