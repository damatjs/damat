import type { Redis } from "@damatjs/redis";
import type { AccelerationRelayOperations } from "./accelerationRelayOperations";

export async function flushAccelerationRelay(
  operations: AccelerationRelayOperations,
  redis: Redis,
  batchSize: number,
  onError: (error: unknown) => void,
): Promise<void> {
  try {
    const signals = await operations.claim(batchSize);
    let checkpoint: string | undefined;
    for (const signal of signals) {
      try {
        await operations.publish(redis, signal);
        await operations.markPublished(signal);
        checkpoint = signal.revision;
      } catch (error) {
        await operations.release(signal, error);
        throw error;
      }
    }
    await operations.updateState({
      mode: "healthy",
      fallbackPollIntervalMs: 5_000,
      ...(checkpoint ? { checkpoint } : {}),
      published: Boolean(checkpoint),
    });
  } catch (error) {
    onError(error);
  }
}
