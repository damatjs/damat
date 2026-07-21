import { expect } from "bun:test";
import {
  enqueueJob,
  findDurableEventActivity,
  listJobActivity,
  listJobAttempts,
  listDurableEventDeliveries,
  listDurableEventDeliveryAttempts,
  publishDurableEvent,
} from "@damatjs/framework";
import {
  cleanupWork,
  configureRedis,
  readWork,
  type RedisMode,
  type WorkKind,
} from "./context";
import { effectComplete, effectState } from "./effect-state";
import * as definitions from "./definitions";
import * as waits from "./wait";

export async function runRecoveryScenario(
  kind: WorkKind,
  redis: RedisMode,
): Promise<void> {
  definitions.resetRecoveryDefinitions();
  await configureRedis(redis);
  const names = definitions.recoveryNames(
    kind,
    crypto.randomUUID().replaceAll("-", ""),
  );
  definitions.registerRecoveryDefinition(names);
  const published =
    kind === "job"
      ? await enqueueJob(names.name, {}, { queue: names.queue })
      : await publishDurableEvent(names.name, {});
  let eventId = kind === "event" ? published.id : undefined;
  let workId = kind === "job" ? published.id : "";
  let first = await waits.spawnWorker(names, redis);
  let second;
  try {
    if (eventId) {
      const delivery = await waits.waitFor(
        "event routing",
        () => listDurableEventDeliveries(eventId!),
        (items) => items.length === 1,
      );
      workId = delivery[0]!.id;
    }
    await waits.waitFor(
      `${kind} running`,
      () => readWork(kind, workId),
      (value) => value?.status === "running",
    );
    const lease = await waits.readLease(kind, workId);
    await waits.waitFor(
      "idempotent effect",
      () => effectState(kind, workId, names.scope),
      effectComplete,
    );
    await waits.killHard(first);
    await waits.waitForLeaseExpiry(kind, workId);
    second = await waits.spawnWorker(names, redis);
    const complete = await waits.waitFor(
      `${kind} recovery`,
      () => readWork(kind, workId),
      (value) => value?.status === "succeeded",
      15_000,
    );
    expect(complete?.result).toEqual({ recovered: true, workId });
    const attempts =
      kind === "job"
        ? await listJobAttempts(workId)
        : await listDurableEventDeliveryAttempts(workId);
    expect(attempts.map((item) => item.outcome)).toEqual(["lost", "succeeded"]);
    const activity =
      kind === "job"
        ? await listJobActivity(workId)
        : await findDurableEventActivity(eventId!);
    expect(activity).toContainEqual(
      expect.objectContaining({
        type: "lease_recovered",
        workerId: lease.workerId,
        leaseToken: lease.leaseToken,
      }),
    );
    expect(await effectState(kind, workId, names.scope)).toEqual({
      count: 1,
      status: "completed",
    });
  } finally {
    await waits.stopChild(first);
    await waits.stopChild(second);
    await cleanupWork(kind, published.id, names.scope, workId);
  }
}
