import { expect, test } from "bun:test";
import { JobWorker, type JobWorkerOptions } from "../../src";

const INT32_MAX = 2_147_483_647;
const TIMER_MAX = 2_147_483_647;
const invalid: JobWorkerOptions[] = [
  { concurrency: INT32_MAX + 1 },
  { pollIntervalMs: TIMER_MAX + 1 },
  { retryIntervalMs: TIMER_MAX + 1 },
  { leaseMs: TIMER_MAX + 1 },
  { heartbeatIntervalMs: TIMER_MAX + 1 },
  { registryHeartbeatIntervalMs: TIMER_MAX + 1 },
  { progressMinimumIntervalMs: TIMER_MAX + 1 },
  { logLimits: { maxCount: Number.MAX_SAFE_INTEGER + 1, maxBytes: 1 } },
  { logLimits: { maxCount: 1, maxBytes: Number.MAX_SAFE_INTEGER + 1 } },
];

for (const options of invalid) {
  test(`rejects out-of-range ${Object.keys(options)[0]}`, () => {
    expect(() => new JobWorker(options)).toThrow();
  });
}

test("accepts numeric boundaries", () => {
  expect(
    () =>
      new JobWorker({
        concurrency: INT32_MAX,
        pollIntervalMs: TIMER_MAX,
        retryIntervalMs: TIMER_MAX,
        leaseMs: TIMER_MAX,
        heartbeatIntervalMs: TIMER_MAX - 1,
        registryHeartbeatIntervalMs: 25_000,
        progressMinimumIntervalMs: TIMER_MAX,
        logLimits: {
          maxCount: Number.MAX_SAFE_INTEGER,
          maxBytes: Number.MAX_SAFE_INTEGER,
        },
      }),
  ).not.toThrow();
});
