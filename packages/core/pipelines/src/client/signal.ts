import {
  getDurabilityClient,
  isTransactionalExecutor,
  recordAccelerationSignal,
  TransactionalExecutorRequiredError,
  validateWorkActor,
  type DurabilityExecutor,
} from "@damatjs/durability";
import type { RunRow } from "../repositories";
import { RUN_SELECT } from "../repositories";
import { publishPipelineWakeup } from "../wakeup";
import type { SignalPipelineOptions } from "./start-types";

export async function signalPipelineRun(
  runId: string,
  name: string,
  payload: unknown,
  options: SignalPipelineOptions,
): Promise<string> {
  validateSignal(runId, name, options);
  if (options.executor) {
    if (!isTransactionalExecutor(options.executor))
      throw new TransactionalExecutorRequiredError();
    return signalWith(options.executor, runId, name, payload, options);
  }
  const id = await getDurabilityClient().transaction((executor) =>
    signalWith(executor, runId, name, payload, options),
  );
  await publishPipelineWakeup(runId);
  return id;
}

async function signalWith(
  executor: DurabilityExecutor,
  runId: string,
  name: string,
  payload: unknown,
  options: SignalPipelineOptions,
): Promise<string> {
  const run = await executor.query<RunRow>(
    `${RUN_SELECT} WHERE r."id"=$1 FOR UPDATE`,
    [runId],
  );
  const row = run.rows[0];
  if (!row || row.completed_at)
    throw new Error(`Active pipeline run "${runId}" was not found`);
  const valid = row.manifest.nodes.some(
    (node) => node.kind === "signal.wait" && node.signal === name,
  );
  if (!valid)
    throw new Error(
      `Signal "${name}" is not declared by pipeline "${row.name}"`,
    );
  const id = crypto.randomUUID();
  const inserted = await executor.query<{ id: string }>(
    `INSERT INTO "_damat_pipeline_signals"
      ("id","run_id","name","payload","idempotency_key","actor","reason")
     VALUES ($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7)
     ON CONFLICT ("run_id","name","idempotency_key") DO UPDATE SET "name"=EXCLUDED."name"
     RETURNING "id"`,
    [
      id,
      runId,
      name,
      JSON.stringify(payload ?? null),
      options.idempotencyKey,
      JSON.stringify(options.actor),
      options.reason,
    ],
  );
  await recordAccelerationSignal({
    topic: "damat:pipelines:wakeup",
    kind: "pipeline",
    resourceId: runId,
    scope: row.name,
    payload: { kind: "pipelines", scope: row.name },
    executor,
  });
  return inserted.rows[0]!.id;
}

function validateSignal(
  runId: string,
  name: string,
  options: SignalPipelineOptions,
): void {
  validateWorkActor(options.actor);
  if (
    !runId.trim() ||
    !name.trim() ||
    !options.idempotencyKey.trim() ||
    !options.reason.trim()
  ) {
    throw new Error(
      "runId, signal name, idempotency key, and reason are required",
    );
  }
}
