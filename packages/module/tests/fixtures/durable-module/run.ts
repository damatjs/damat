import {
  listDurableEventDeliveries,
  publishDurableEvent,
} from "@damatjs/events";
import { enqueueJob, getJobRun } from "@damatjs/jobs";
import { findPipelineRun, startPipeline } from "@damatjs/pipelines";
import {
  assertServerPortAvailable,
  moduleReadyLines,
  startModuleApp,
} from "../../../src";

async function waitFor<T>(
  read: () => Promise<T>,
  reached: (value: T) => boolean,
): Promise<T> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const value = await read();
    if (reached(value)) return value;
    await Bun.sleep(50);
  }
  throw new Error("Timed out waiting for standalone durable work");
}

const running = await startModuleApp({ packageDir: import.meta.dir, port: 0 });
let result: Record<string, unknown>;
try {
  const url = `http://127.0.0.1:${running.port}`;
  const health = await fetch(`${url}/health`);
  await fetch(`${url}/api/records`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), value: "ready" }),
  });
  const records = await fetch(`${url}/api/records`).then((item) => item.json());
  const job = await enqueueJob("standalone.fixture.echo", { direct: true });
  const event = await publishDurableEvent("standalone.fixture.created", {
    id: "event",
  });
  const pipeline = await startPipeline("standalone.fixture.pipeline", {
    pipeline: true,
  });
  const finalJob = await waitFor(
    () => getJobRun(job.id),
    (item) => item?.status === "succeeded",
  );
  const deliveries = await waitFor(
    () => listDurableEventDeliveries(event.id),
    (items) =>
      items.length === 2 && items.every((item) => item.status === "succeeded"),
  );
  const finalPipeline = await waitFor(
    () => findPipelineRun(pipeline.id),
    (item) => item?.status === "succeeded",
  );
  result = {
    health: health.status,
    records,
    job: finalJob?.status,
    events: deliveries.map(({ consumer, status }) => ({ consumer, status })),
    pipeline: finalPipeline?.status,
    readiness: moduleReadyLines(running),
    port: running.port,
  };
} finally {
  await running.stop();
}
await assertServerPortAvailable(result.port as number, "127.0.0.1");
console.log(
  `STANDALONE_RESULT=${JSON.stringify({ ...result, portReleased: true })}`,
);
