import { expect, test } from "bun:test";
import { JobWorker, type JobWorkerOptions } from "../../src";

const invalid: [string, JobWorkerOptions][] = [
  ["queue", { queue: " " }],
  ["workerId", { workerId: "" }],
  ["concurrency", { concurrency: 0 }],
  ["concurrency", { concurrency: 1.5 }],
  ["pollIntervalMs", { pollIntervalMs: 0 }],
  ["retryIntervalMs", { retryIntervalMs: Number.NaN }],
  ["leaseMs", { leaseMs: Number.POSITIVE_INFINITY }],
  ["heartbeatIntervalMs", { heartbeatIntervalMs: -1 }],
  ["registryHeartbeatIntervalMs", { registryHeartbeatIntervalMs: 25_001 }],
  ["progressMinimumIntervalMs", { progressMinimumIntervalMs: -1 }],
  ["progressMinimumIntervalMs", { progressMinimumIntervalMs: Infinity }],
  ["logLimits.maxCount", { logLimits: { maxCount: 0, maxBytes: 1 } }],
  ["logLimits.maxBytes", { logLimits: { maxCount: 1, maxBytes: 0 } }],
  ["heartbeatIntervalMs", { leaseMs: 10, heartbeatIntervalMs: 10 }],
];

for (const [field, options] of invalid) {
  test(`rejects invalid ${field}`, () => {
    expect(() => new JobWorker(options)).toThrow(field);
  });
}

test("accepts boundary worker options", () => {
  expect(
    () =>
      new JobWorker({
        queue: "jobs",
        workerId: "worker-1",
        concurrency: 1,
        registryHeartbeatIntervalMs: 25_000,
        progressMinimumIntervalMs: 0,
        logLimits: { maxCount: 1, maxBytes: 1 },
      }),
  ).not.toThrow();
});
