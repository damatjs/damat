import { beforeEach, expect, test } from "bun:test";
import { claimJobRuns } from "../../src/worker/claim";
import { createJobRunContext } from "../../src/context/create";
import { listJobActivity, listJobLogs, getJobRun } from "../../src/client";
import { prepareWorkerTest, queuedRun } from "./context";

beforeEach(prepareWorkerTest);

async function context(
  options: Parameters<typeof createJobRunContext>[2] = {},
) {
  const item = await queuedRun();
  const [claim] = await claimJobRuns({
    queue: item.queue,
    workerId: "worker-context",
    limit: 1,
    leaseMs: 30_000,
  });
  return {
    claim: claim!,
    context: createJobRunContext(claim!, new AbortController(), {
      redaction: { keys: ["token"] },
      progressMinimumIntervalMs: 0,
      ...options,
    }),
  };
}

test("progress persists a fenced snapshot and sampled activity", async () => {
  const current = await context();
  await current.context.progress({ percent: 25 }, { phase: "start" });
  expect((await getJobRun(current.claim.id))?.progress).toEqual({
    percent: 25,
  });
  expect((await listJobActivity(current.claim.id)).at(-1)).toMatchObject({
    type: "progress",
    attemptNumber: 1,
    metadata: { phase: "start", value: { percent: 25 } },
  });
});

test("logs are ordered, redacted, and fenced", async () => {
  const current = await context();
  await current.context.log("info", "working", { token: "secret", step: 1 });
  expect(await listJobLogs(current.claim.id)).toMatchObject([
    {
      level: "info",
      message: "working",
      context: {
        token: "[REDACTED]",
        step: 1,
      },
    },
  ]);
  const stale = createJobRunContext(
    { ...current.claim, leaseToken: crypto.randomUUID() },
    new AbortController(),
  );
  await expect(stale.log("info", "stale")).rejects.toThrow(/lease/i);
});

test("log byte limits match PostgreSQL jsonb storage size", async () => {
  const message = "x";
  const data = { first: 1, second: 2 };
  const compactBytes = new TextEncoder().encode(
    message + JSON.stringify(data),
  ).byteLength;
  const current = await context({
    logLimits: { maxCount: 10, maxBytes: compactBytes },
  });
  await current.context.log("info", message, data);
  expect(await listJobLogs(current.claim.id)).toEqual([]);
  expect((await listJobActivity(current.claim.id)).at(-1)).toMatchObject({
    type: "logs_truncated",
  });
});
