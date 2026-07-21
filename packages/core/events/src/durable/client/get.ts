import type { DurabilityExecutor } from "@damatjs/durability";
import { findDurableEvent, findDurableEventActivity } from "../repositories";

export const getDurableEvent = (id: string, executor?: DurabilityExecutor) =>
  findDurableEvent(id, executor);

export const listDurableEventActivity = (
  eventId: string,
  executor?: DurabilityExecutor,
) => findDurableEventActivity(eventId, executor);
