import { Pool } from "@damatjs/deps/pg";
import {
  clearDurabilityClient,
  createDurabilityClient,
  enqueueJob,
  findPipelineRun,
  getJobRun,
  listDurableEventDeliveries,
  publishDurableEvent,
  setDurabilityClient,
  startPipeline,
} from "@damatjs/framework";
import "../src/events";
import "../src/jobs";
import "../src/pipelines";
import "./worker-health";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required for durable acceptance");
const timeoutMs = Number(process.env.DURABLE_ACCEPTANCE_TIMEOUT_MS ?? 60_000);
const mode = process.env.ACCEPTANCE_MODE ?? "redis-live";

async function waitFor<T>(
  label: string,
  read: () => Promise<T>,
  succeeded: (value: T) => boolean,
  failed: (value: T) => boolean,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!succeeded(value)) {
    if (failed(value))
      throw new Error(`${label} failed: ${JSON.stringify(value)}`);
    if (Date.now() >= deadline)
      throw new Error(`${label} timed out: ${JSON.stringify(value)}`);
    await Bun.sleep(250);
    value = await read();
  }
  return value;
}

const id = crypto.randomUUID();
const pool = new Pool({ connectionString: url });
setDurabilityClient(createDurabilityClient({ pool }));

try {
  const job = await enqueueJob("reports.generate", {
    reportId: `acceptance-${id}`,
    requestedBy: `operations-${mode}`,
  });
  const event = await publishDurableEvent("user.created", {
    userId: `acceptance-${id}`,
    email: `event-${id}@example.invalid`,
  });
  const pipeline = await startPipeline("user.onboard-and-report", {
    user: { email: `pipeline-${id}@example.invalid`, name: "Operations" },
    report: {
      reportId: `pipeline-${id}`,
      requestedBy: `operations-${mode}`,
    },
  });
  const [jobRun, deliveries, pipelineRun] = await Promise.all([
    waitFor(
      "job",
      () => getJobRun(job.id),
      (run) => run?.status === "succeeded",
      (run) => ["dead_lettered", "cancelled"].includes(run?.status ?? ""),
    ),
    waitFor(
      "event",
      () => listDurableEventDeliveries(event.id),
      (rows) =>
        rows.length === 2 && rows.every((row) => row.status === "succeeded"),
      (rows) =>
        rows.some((row) => ["dead_lettered", "cancelled"].includes(row.status)),
    ),
    waitFor(
      "pipeline",
      () => findPipelineRun(pipeline.id),
      (run) => run?.status === "succeeded",
      (run) =>
        ["failed", "cancelled", "compensated", "compensation_failed"].includes(
          run?.status ?? "",
        ),
    ),
  ]);
  console.log(
    JSON.stringify(
      { mode, job: jobRun, event: deliveries, pipeline: pipelineRun },
      null,
      2,
    ),
  );
} finally {
  clearDurabilityClient();
  await pool.end();
}
