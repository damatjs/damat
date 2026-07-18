import type { LivenessWorker } from "./workerLiveness";

export interface WakeupTargets {
  job?: LivenessWorker & { wake(): void };
  router?: { wake(): void };
  event?: LivenessWorker & { wake(): void };
}
