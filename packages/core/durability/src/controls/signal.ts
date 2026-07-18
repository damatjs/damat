import { recordAccelerationSignal } from "../acceleration";
import type { DurabilityExecutor } from "../client/types";
import type { WorkKind } from "../workers";

export function recordControlSignal(
  executor: DurabilityExecutor,
  kind: WorkKind,
  scope: string,
): Promise<string> {
  const event = kind === "event" ? decodeEventScope(scope) : undefined;
  const topic =
    kind === "job"
      ? "damat:jobs:wakeup"
      : kind === "event"
        ? "damat:events:wakeup"
        : "damat:pipelines:wakeup";
  return recordAccelerationSignal({
    topic,
    kind: "control",
    scope,
    payload:
      kind === "job"
        ? { kind: "jobs", queue: scope }
        : kind === "pipeline"
          ? { kind: "pipelines", scope }
          : event
            ? { kind: "events", target: "delivery", ...event }
            : { kind: "events", target: "router" },
    executor,
  });
}

function decodeEventScope(
  scope: string,
): { event: string; consumer: string } | undefined {
  try {
    const value = JSON.parse(scope) as unknown;
    if (!Array.isArray(value) || value.length !== 2) return undefined;
    return { event: String(value[0]), consumer: String(value[1]) };
  } catch {
    return undefined;
  }
}
