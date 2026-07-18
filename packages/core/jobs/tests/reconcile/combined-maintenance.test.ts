import { beforeAll, expect, test } from "bun:test";
import { setRetentionOverride } from "@damatjs/durability";
import { reconcileJobWork } from "../../src/worker/reconciler";
import { ensureStorage, uniqueName } from "../storage/context";

beforeAll(ensureStorage);

const actor = { id: "maintenance-test", type: "system" as const };

test("combined maintenance applies finite retention overrides", async () => {
  const queue = uniqueName("combined-maintenance");
  await setRetentionOverride({
    workKind: "job",
    scope: queue,
    retentionMs: 7 * 86_400_000,
    actor,
    reason: "test finite retention",
  });
  await expect(reconcileJobWork({
    workerId: "maintenance-worker",
    queue,
    batchSize: 1,
    retentionMs: 90 * 86_400_000,
    includeRetention: true,
  })).resolves.toBeUndefined();
});

test("combined maintenance honors forever retention", async () => {
  const queue = uniqueName("forever-maintenance");
  await setRetentionOverride({
    workKind: "job",
    scope: queue,
    retentionMs: "forever",
    actor,
    reason: "test legal hold",
  });
  await expect(reconcileJobWork({
    workerId: "maintenance-worker",
    queue,
    batchSize: 1,
    retentionMs: 90 * 86_400_000,
    includeRetention: true,
  })).resolves.toBeUndefined();
});
