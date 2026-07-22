import { defineRoute } from "@damatjs/framework/router";
import {
  listDurableEventDeliveries,
  publishDurableEvent,
} from "@damatjs/events";
import { enqueueJob, getJobRun } from "@damatjs/jobs";
import { findPipelineRun, startPipeline } from "@damatjs/pipelines";
import { PoolManager } from "@damatjs/services";

async function waitFor<T>(
  read: () => Promise<T>,
  complete: (value: T) => boolean,
): Promise<T> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const value = await read();
    if (complete(value)) return value;
    await Bun.sleep(50);
  }
  throw new Error("Timed out waiting for durable fixture work");
}

export const POST = defineRoute(async (context) => {
  const job = await enqueueJob("standalone.fixture.echo", { cli: true });
  const event = await publishDurableEvent("standalone.fixture.created", {
    id: crypto.randomUUID(),
  });
  const pipeline = await startPipeline("standalone.fixture.pipeline", {
    cli: true,
  });
  const completedJob = await waitFor(
    () => getJobRun(job.id),
    (item) => item?.status === "succeeded",
  );
  const deliveries = await waitFor(
    () => listDurableEventDeliveries(event.id),
    (items) =>
      items.length === 2 && items.every((item) => item.status === "succeeded"),
  );
  const completedPipeline = await waitFor(
    () => findPipelineRun(pipeline.id),
    (item) => item?.status === "succeeded",
  );
  return context.json({
    job: completedJob?.status,
    events: deliveries.map(({ consumer, status }) => ({ consumer, status })),
    pipeline: completedPipeline?.status,
  });
});

export const GET = defineRoute(async (context) => {
  const result = await PoolManager.getPool().query(
    `SELECT "id" FROM "_damat_workers"
     WHERE "stopping_at" IS NULL AND "stopped_at" IS NULL`,
  );
  return context.json({ active: result.rows.length });
});
