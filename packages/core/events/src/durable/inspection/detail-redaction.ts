import { redactValue } from "@damatjs/durability";
import type { queryEventDetail } from "./detail-query";
import { createEventSummary } from "./list-mapper";
import type { ResolvedEventInspectionOptions } from "./options";
import type { DurableEventDetail } from "./types";
import { deriveEventViews } from "./view-derive";

type DetailData = NonNullable<Awaited<ReturnType<typeof queryEventDetail>>>;

export function mapEventDetail(
  data: DetailData,
  options: ResolvedEventInspectionOptions,
): DurableEventDetail {
  const redact = <T>(value: T): T => redactValue(value, options.redaction) as T;
  const counts = Object.fromEntries(
    data.deliveries.map(({ status }) => [
      status,
      data.deliveries.filter((item) => item.status === status).length,
    ]),
  );
  const summary = createEventSummary(
    data.event,
    counts,
    data.activity.some(({ type }) => type === "lease_recovered"),
    options,
    deriveEventViews(data.event, data.deliveries, new Date()),
  );
  return {
    ...summary,
    deliveries: data.deliveries.map(({ result, attempts, ...delivery }) => ({
      ...delivery,
      ...(delivery.progress !== undefined
        ? { progress: redact(delivery.progress) }
        : {}),
      ...(options.visibility === "full" && result !== undefined
        ? { result: redact(result) }
        : {}),
      ...(delivery.lastError ? { lastError: redact(delivery.lastError) } : {}),
      attempts: attempts.map(({ result: attemptResult, ...attempt }) => ({
        ...attempt,
        ...(options.visibility === "full" && attemptResult !== undefined
          ? { result: redact(attemptResult) }
          : {}),
        ...(attempt.error ? { error: redact(attempt.error) } : {}),
      })),
      logs: delivery.logs.map((log) => ({
        ...log,
        context: redact(log.context),
      })),
    })),
    activity: data.activity.map((item) => ({
      ...item,
      metadata: redact(item.metadata),
      actor: redact(item.actor),
    })),
    workers: data.workers.map(({ application, deployment, ...worker }) => ({
      ...worker,
      ...(options.visibility !== "hidden"
        ? { application: redact(application), deployment: redact(deployment) }
        : {}),
    })),
    controls: data.history.controls.map((control) => ({
      ...control,
      actor: redact(control.actor),
    })),
    controlHistoryTruncated: data.history.truncated,
  };
}
