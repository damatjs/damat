import type { AccelerationSignal } from "@damatjs/durability";
import type { Redis } from "@damatjs/redis";

export async function publishAccelerationSignal(
  redis: Redis,
  signal: AccelerationSignal,
): Promise<void> {
  if (signal.resourceId && signal.topic !== "damat:inspection:invalidate") {
    const key = readyKey(signal);
    await redis.zadd(key, signal.availableAt.getTime(), signal.resourceId);
  }
  if (signal.topic !== "damat:inspection:invalidate") {
    await redis.publish(signal.topic, JSON.stringify(signal.payload));
  }
  await redis.publish(
    "damat:inspection:invalidate",
    JSON.stringify({
      kind: signal.kind,
      ...(signal.resourceId ? { resourceId: signal.resourceId } : {}),
      ...(signal.scope ? { scope: signal.scope } : {}),
      revision: signal.revision,
    }),
  );
}

function readyKey(signal: AccelerationSignal): string {
  if (signal.kind === "job") return `damat:ready:jobs:${signal.scope ?? "default"}`;
  if (signal.scope === "router") return "damat:ready:events:router";
  return `damat:ready:events:delivery:${signal.scope ?? "all"}`;
}
