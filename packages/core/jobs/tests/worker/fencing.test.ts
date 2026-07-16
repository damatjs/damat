import { beforeEach, expect, test } from "bun:test";
import { cancelJobRun } from "../../src/client";
import { claimJobRuns } from "../../src/worker/claim";
import { heartbeatJobClaim } from "../../src/worker/heartbeat";
import { completeJobSuccess } from "../../src/worker/succeed";
import { createJobRunContext } from "../../src/context/create";
import { claimOne, expireLease, prepareWorkerTest } from "./context";

beforeEach(prepareWorkerTest);

async function claim() {
  return claimOne("worker-fence");
}

test("valid heartbeats renew only the current fenced lease", async () => {
  const claimed = await claim();
  expect(await heartbeatJobClaim(claimed, { leaseMs: 30_000 })).toMatchObject({
    cancellationRequested: false,
  });
  await expect(
    heartbeatJobClaim(
      { ...claimed, leaseToken: crypto.randomUUID() },
      {
        leaseMs: 30_000,
      },
    ),
  ).rejects.toThrow(/lease/i);
});

test("stale success is rejected and expired work can be reclaimed", async () => {
  const claimed = await claim();
  await expireLease(claimed.id);
  const [reclaimed] = await claimJobRuns({
    queue: claimed.queue,
    workerId: "worker-recovery",
    limit: 1,
    leaseMs: 30_000,
  });
  expect(reclaimed?.attemptCount).toBe(2);
  await expect(completeJobSuccess(claimed, undefined)).rejects.toThrow(
    /lease/i,
  );
});

test("heartbeat cancellation aborts the handler signal", async () => {
  const claimed = await claim();
  const controller = new AbortController();
  const context = createJobRunContext(claimed, controller);
  await cancelJobRun(claimed.id);
  const heartbeat = await heartbeatJobClaim(claimed, { leaseMs: 30_000 });
  if (heartbeat.cancellationRequested) controller.abort();
  expect(context.signal.aborted).toBe(true);
});
