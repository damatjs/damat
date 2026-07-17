import { expect, test } from "bun:test";
import { EventWorkerRuntimeComponents } from "../../src/durable/worker/runtime-components";
import { resolveEventWorkerOptions } from "../../src/durable/worker/runtime-options";
import type { ClaimedEventDelivery } from "../../src";

test("runtime components discard a claim after claiming stops", () => {
  const components = new EventWorkerRuntimeComponents(
    "guard-worker",
    resolveEventWorkerOptions({
      consumers: [{ event: "guard.event", consumer: "consumer" }],
    }),
    () => {},
    () => false,
  );
  const guarded = components as unknown as {
    startClaim(claim: ClaimedEventDelivery): void;
  };
  guarded.startClaim({} as ClaimedEventDelivery);
  expect(components.active.size).toBe(0);
});
