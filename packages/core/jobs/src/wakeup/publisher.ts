import { getLogger } from "@damatjs/logger";
import type { JobWakeupPublisher } from "./types";

export const JOB_WAKEUP_CHANNEL = "damat:jobs:wakeup";
const PUBLISHER = Symbol.for("damatjs.jobs.wakeupPublisher");
type WakeupGlobal = typeof globalThis & { [PUBLISHER]?: JobWakeupPublisher };
const storage = globalThis as WakeupGlobal;

export function configureJobWakeupPublisher(
  publisher: JobWakeupPublisher,
): void {
  storage[PUBLISHER] = publisher;
}

export function clearJobWakeupPublisher(): void {
  delete storage[PUBLISHER];
}

export async function publishJobWakeup(queue: string): Promise<boolean> {
  const publisher = storage[PUBLISHER];
  if (!publisher) return false;
  try {
    await publisher.publish(
      JOB_WAKEUP_CHANNEL,
      JSON.stringify({ kind: "jobs", queue }),
    );
    return true;
  } catch (error) {
    getLogger().warn("Job wake-up publication failed", {
      queue,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
