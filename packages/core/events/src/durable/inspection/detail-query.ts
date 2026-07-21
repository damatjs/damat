import { listWorkers, type DurabilityExecutor } from "@damatjs/durability";
import {
  findDurableEvent,
  findDurableEventActivity,
  listDurableEventDeliveries,
  listEventDeliveryAttemptsBatch,
  listEventDeliveryLogsBatch,
} from "../repositories";
import { queryEventControlHistory } from "./control-history";
import type { ResolvedEventInspectionOptions } from "./options";

export async function queryEventDetail(
  executor: DurabilityExecutor,
  id: string,
  options: ResolvedEventInspectionOptions,
) {
  const event = await findDurableEvent(id, executor);
  if (!event) return null;
  const deliveries = await listDurableEventDeliveries(id, executor);
  const activity = await findDurableEventActivity(id, executor);
  const deliveryIds = deliveries.map(({ id: deliveryId }) => deliveryId);
  const [attemptRows, logRows] = await Promise.all([
    listEventDeliveryAttemptsBatch(deliveryIds, executor),
    listEventDeliveryLogsBatch(deliveryIds, executor),
  ]);
  const attempts = groupByDelivery(attemptRows);
  const logs = groupByDelivery(logRows);
  const detailed = deliveries.map((delivery) => ({
    ...delivery,
    attempts: attempts.get(delivery.id) ?? [],
    logs: logs.get(delivery.id) ?? [],
    logsTruncated: activity.some(
      (item) =>
        item.deliveryId === delivery.id && item.type === "logs_truncated",
    ),
  }));
  const workerIds = [
    ...new Set(
      detailed.flatMap(({ attempts }) =>
        attempts.map(({ workerId }) => workerId),
      ),
    ),
  ];
  const workers = await listWorkers({
    ids: workerIds,
    staleAfterMs: options.staleAfterMs,
    executor,
  });
  const history = await queryEventControlHistory(
    executor,
    event.name,
    deliveries.map(({ consumer }) => consumer),
  );
  return { event, deliveries: detailed, activity, workers, history };
}

function groupByDelivery<T extends { deliveryId: string }>(rows: T[]) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const values = groups.get(row.deliveryId) ?? [];
    values.push(row);
    groups.set(row.deliveryId, values);
  }
  return groups;
}
