import type { Redis } from "@damatjs/redis";

export async function probeAccelerationPublish(redis: Redis): Promise<void> {
  try {
    await redis.publish(`damat:health:${crypto.randomUUID()}`, "probe");
  } catch (cause) {
    throw new Error("PUBLISH durability health channel failed", { cause });
  }
}
