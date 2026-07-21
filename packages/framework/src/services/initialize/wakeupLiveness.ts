import type { Redis } from "@damatjs/redis";
import { WorkerLiveness, type LivenessWorker } from "./workerLiveness";
import type { WakeupTargets } from "./wakeupTargets";

export function createWakeupLiveness(
  redis: Redis,
  targets: WakeupTargets,
  ttlMs: number,
  onError: (error: unknown) => void,
): WorkerLiveness {
  const workers = [targets.job, targets.event, targets.pipeline?.worker].filter(
    Boolean,
  ) as LivenessWorker[];
  return new WorkerLiveness(redis, workers, ttlMs, onError);
}

export const wakeupRetryDelay = (attempt: number): number =>
  Math.min(30_000, 1_000 * 2 ** attempt);
