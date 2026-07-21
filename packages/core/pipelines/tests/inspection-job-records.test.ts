import { expect, test } from "bun:test";
import { readPipelineJobRecords } from "../src/inspection/job-records";

const jobId = crypto.randomUUID();
const node = { id: "node", jobRunId: jobId } as never;
const date = new Date("2026-07-18T00:00:00Z");
const rows = (sql: string) =>
  sql.includes("attempts")
    ? [
        {
          id: "1",
          run_id: jobId,
          attempt_number: 1,
          worker_id: "worker",
          lease_token: "lease",
          started_at: date,
          available_at: null,
          wait_ms: null,
          heartbeat_at: null,
          finished_at: null,
          duration_ms: null,
          result: { secret: "result" },
          outcome: null,
          error: null,
        },
      ]
    : sql.includes("logs")
      ? [
          {
            id: "2",
            run_id: jobId,
            attempt_number: 1,
            timestamp: date,
            level: "info",
            message: "secret",
            context: { secret: "context" },
            worker_id: null,
            correlation_id: null,
            trace_id: null,
            sequence: 1,
          },
        ]
      : [
          {
            id: "3",
            run_id: jobId,
            attempt_number: null,
            type: "queued",
            previous_status: null,
            next_status: null,
            worker_id: null,
            lease_token: null,
            occurred_at: date,
            reason: null,
            duration_ms: null,
            metadata: { secret: "metadata" },
            actor: { id: "system" },
          },
        ];
const executor = {
  query: async (sql: string) => ({ rows: rows(sql), rowCount: 1 }),
};
const options = (visibility: "full" | "metadata" | "hidden") =>
  ({
    visibility,
    redaction: { keys: ["secret"] },
  }) as never;

test("full job record inspection redacts nested sensitive values", async () => {
  const result = await readPipelineJobRecords(
    executor as never,
    [node],
    options("full"),
  );
  expect(result[jobId]?.attempts[0]).toMatchObject({
    result: { secret: "[REDACTED]" },
  });
  expect(result[jobId]?.logs[0]).toMatchObject({
    context: { secret: "[REDACTED]" },
  });
});

test("metadata and hidden job inspection strip content while preserving status", async () => {
  const metadata = await readPipelineJobRecords(
    executor as never,
    [node],
    options("metadata"),
  );
  expect(metadata[jobId]?.attempts[0]).not.toHaveProperty("result");
  expect(metadata[jobId]?.logs[0]).not.toHaveProperty("message");
  const hidden = await readPipelineJobRecords(
    executor as never,
    [node],
    options("hidden"),
  );
  expect(hidden[jobId]).toEqual({ attempts: [], logs: [], activity: [] });
});
