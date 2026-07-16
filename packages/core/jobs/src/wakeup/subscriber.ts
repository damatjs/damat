import { getLogger } from "@damatjs/logger";
import { JOB_WAKEUP_CHANNEL } from "./publisher";
import type {
  JobWakeup,
  JobWakeupConnection,
  JobWakeupRedis,
  StopJobWakeupSubscriber,
} from "./types";

export async function startJobWakeupSubscriber(
  redis: JobWakeupRedis,
  wake: (queue: string) => void,
): Promise<StopJobWakeupSubscriber> {
  let connection: JobWakeupConnection | undefined;
  try {
    connection = redis.duplicate();
    const active = connection;
    const listener = (channel: string, message: string) => {
      if (channel !== JOB_WAKEUP_CHANNEL) return;
      const parsed = parseJobWakeup(message);
      if (parsed) wake(parsed.queue);
    };
    active.on("message", listener);
    await active.subscribe(JOB_WAKEUP_CHANNEL);
    return async () => {
      active.off("message", listener);
      await active.unsubscribe(JOB_WAKEUP_CHANNEL).catch(() => {});
      await active.quit().catch(() => {});
    };
  } catch (error) {
    getLogger().warn("Job wake-up subscription failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    await connection?.quit().catch(() => {});
    return async () => {};
  }
}

export function parseJobWakeup(message: string): JobWakeup | undefined {
  try {
    const value = JSON.parse(message) as Record<string, unknown>;
    const keys = Object.keys(value);
    if (
      keys.length !== 2 ||
      value.kind !== "jobs" ||
      typeof value.queue !== "string" ||
      !value.queue.trim()
    )
      return undefined;
    return { kind: "jobs", queue: value.queue };
  } catch {
    return undefined;
  }
}
