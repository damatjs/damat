import {
  getWorkControl,
  pauseWork,
  resumeWork,
  validateWorkActor,
  type DurabilityExecutor,
  type WorkActor,
} from "@damatjs/durability";
import { publishEventConsumerWakeup } from "../wakeup";
import { encodeEventConsumerScope } from "../worker";
import { DurableEventTransitionError } from "./errors";
import type { ResolvedEventInspectionOptions } from "./options";

export function pauseInspectedConsumer(
  event: string,
  consumer: string,
  actor: WorkActor,
  reason: string | undefined,
  options: ResolvedEventInspectionOptions,
): Promise<void> {
  validateWorkActor(actor);
  return changeControl(event, consumer, actor, reason, true, options);
}

export async function resumeInspectedConsumer(
  event: string,
  consumer: string,
  actor: WorkActor,
  options: ResolvedEventInspectionOptions,
): Promise<void> {
  validateWorkActor(actor);
  await changeControl(event, consumer, actor, undefined, false, options);
  await publishEventConsumerWakeup(event, consumer);
}

async function changeControl(
  event: string,
  consumer: string,
  actor: WorkActor,
  reason: string | undefined,
  paused: boolean,
  options: ResolvedEventInspectionOptions,
): Promise<void> {
  const scope = encodeEventConsumerScope(event, consumer);
  await options.client.transaction(async (executor) => {
    await lockControl(executor, scope);
    const current = await getWorkControl({ kind: "event", scope, executor });
    if ((current?.paused ?? false) === paused) {
      throw new DurableEventTransitionError(
        `Durable event consumer is already ${paused ? "paused" : "resumed"}`,
      );
    }
    const input = {
      kind: "event" as const,
      scope,
      actor,
      ...(reason ? { reason } : {}),
      executor,
    };
    await (paused ? pauseWork(input) : resumeWork(input));
  });
}

async function lockControl(
  executor: DurabilityExecutor,
  scope: string,
): Promise<void> {
  await executor.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`, [
    `event:${scope}`,
  ]);
}
