import { getInspectedEvent } from "./detail";
import {
  cancelInspectedDelivery,
  pauseInspectedConsumer,
  resumeInspectedConsumer,
  retryInspectedDelivery,
  runInspectedEventRetention,
} from "./admin";
import { listInspectedEvents } from "./list";
import { resolveEventInspectionOptions } from "./options";
import { getEventOperationalSummary } from "./summary";
import type {
  DurableEventInspectionClient,
  DurableEventInspectionOptions,
} from "./client-types";

export function createDurableEventInspectionClient(
  input: DurableEventInspectionOptions,
): DurableEventInspectionClient {
  const options = resolveEventInspectionOptions(input);
  return {
    listEvents: (filter = {}) => listInspectedEvents(filter, options),
    getEvent: (id) => getInspectedEvent(id, options),
    getSummary: (filter) => getEventOperationalSummary(filter, options),
    cancelDelivery: (id, actor, reason) =>
      cancelInspectedDelivery(id, actor, reason, options),
    retryDelivery: (id, actor) => retryInspectedDelivery(id, actor, options),
    pauseConsumer: (event, consumer, actor, reason) =>
      pauseInspectedConsumer(event, consumer, actor, reason, options),
    resumeConsumer: (event, consumer, actor) =>
      resumeInspectedConsumer(event, consumer, actor, options),
    runRetention: (request, actor) =>
      runInspectedEventRetention(request, actor, options),
  };
}
