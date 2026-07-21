import { expect, test } from "bun:test";
import { DEFAULT_DURABLE_EVENT_POLICY } from "../../src/durable/definitions/defaults";
import { resolveEventPolicy } from "../../src/durable/definitions/policy";
import { resolveRouterOptions } from "../../src/durable/router/options";
import { resolveEventWorkerOptions } from "../../src/durable/worker/runtime-options";

test("durable event loops avoid one-second idle polling", () => {
  expect(resolveRouterOptions({}).pollIntervalMs).toBe(5_000);
  const worker = resolveEventWorkerOptions({
    consumers: [{ event: "mail.sent", consumer: "audit" }],
  });
  expect(worker.pollIntervalMs).toBe(5_000);
  expect(worker.registryHeartbeatIntervalMs).toBe(30_000);
});

test("event retention defaults to 90 days and accepts forever", () => {
  expect(DEFAULT_DURABLE_EVENT_POLICY.retentionMs).toBe(7_776_000_000);
  expect(resolveEventPolicy({ retentionMs: "forever" }).retentionMs).toBe(
    "forever",
  );
});
