import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  clearDurabilityClient,
  getDurabilityClient,
  setDurabilityClient,
  type DurabilityClient,
} from "@damatjs/durability";
import { EventWorkerReconcilerLoop } from "../../src/durable/worker/reconciler-loop";
import { EventWorkerRegistryLoop } from "../../src/durable/worker/registry-loop";
import { resolveEventWorkerOptions } from "../../src/durable/worker/runtime-options";
import { waitUntil } from "./wait";

let previous: DurabilityClient | undefined;
beforeEach(() => {
  try {
    previous = getDurabilityClient();
  } catch {
    previous = undefined;
  }
});
afterEach(() =>
  previous ? setDurabilityClient(previous) : clearDurabilityClient(),
);

test("maintenance callbacks repeat and stop", async () => {
  let queries = 0;
  let transactions = 0;
  setDurabilityClient(
    fakeClient(
      async () => void transactions++,
      async () => {
        queries++;
        return { rows: [], rowCount: 1 };
      },
    ),
  );
  const [registry, reconciler] = loops();
  registry.start();
  reconciler.start();
  await waitUntil(() => queries > 1 && transactions > 2);
  await Promise.all([registry.stop(), reconciler.stop()]);
  expect(queries).toBeGreaterThan(1);
});

test("maintenance failures retry and quiesce", async () => {
  let failures = 0;
  const reject = async (): Promise<never> => {
    failures++;
    throw new Error("maintenance failed");
  };
  setDurabilityClient(fakeClient(reject, reject));
  const [registry, reconciler] = loops();
  registry.start();
  reconciler.start();
  await waitUntil(() => failures > 2);
  await Promise.all([registry.stop(), reconciler.stop()]);
  expect(failures).toBeGreaterThan(2);
});

function loops() {
  const options = resolveEventWorkerOptions({
    consumers: [{ event: "loop.event", consumer: "consumer" }],
    registryHeartbeatIntervalMs: 2,
    reconcileIntervalMs: 2,
    retentionIntervalMs: 2,
    retryIntervalMs: 2,
  });
  return [
    new EventWorkerRegistryLoop("loop-worker", options, () => 3),
    new EventWorkerReconcilerLoop("loop-worker", options),
  ] as const;
}

function fakeClient(
  transaction: () => Promise<unknown>,
  query: () => Promise<{ rows: never[]; rowCount: number }>,
): DurabilityClient {
  return {
    pool: {} as DurabilityClient["pool"],
    transaction,
    query,
  } as DurabilityClient;
}
