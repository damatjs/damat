import {
  clearDurableEventDefinitions,
  clearJobDefinitions,
  defineDurableEvent,
  defineDurableEventHandler,
  defineJob,
  type DurableEventHandlerContext,
  type JobRunContext,
} from "@damatjs/framework";

export function resetRecoveryDefinitions(): void {
  clearJobDefinitions();
  clearDurableEventDefinitions();
}

export interface RecoveryNames {
  kind: "event" | "job";
  name: string;
  queue: string;
  consumer: string;
  scope: string;
}

export function recoveryNames(kind: "event" | "job", suffix: string) {
  return {
    kind,
    name: `task12.recovery.${kind}.${suffix}`,
    queue: `task12-recovery-${suffix}`,
    consumer: `task12Recovery${suffix}`,
    scope: `task12:${kind}-effect:${suffix}`,
  } satisfies RecoveryNames;
}

type EffectContext = Pick<JobRunContext, "withIdempotency">;

async function executeEffect(
  kind: "event" | "job",
  key: string,
  scope: string,
  context: EffectContext,
) {
  const effect = await context.withIdempotency({ scope, key }, async (tx) => {
    const result = await tx.query<{ count: number | string }>(
      `INSERT INTO "_damat_recovery_effects" ("kind","work_id","count")
       VALUES ($1,$2,1) ON CONFLICT ("kind","work_id") DO UPDATE
       SET "count"="_damat_recovery_effects"."count"+1 RETURNING "count"`,
      [kind, key],
    );
    return { count: Number(result.rows[0]!.count) };
  });
  if (!effect.replayed) await new Promise<never>(() => {});
  return { recovered: true, workId: key };
}

export function registerRecoveryDefinition(names: RecoveryNames): void {
  if (names.kind === "job") {
    defineJob(
      names.name,
      (_payload, context) =>
        executeEffect("job", context.runId, names.scope, context),
      { queue: names.queue, maxAttempts: 3 },
    );
    return;
  }
  defineDurableEvent(names.name, { maxAttempts: 3 });
  defineDurableEventHandler(
    names.name,
    names.consumer,
    (_payload, context: DurableEventHandlerContext) =>
      executeEffect("event", context.deliveryId, names.scope, context),
  );
}
