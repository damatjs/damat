import {
  EVENT_WAKEUP_CHANNEL,
  parseEventWakeup,
} from "@damatjs/events";
import { JOB_WAKEUP_CHANNEL, parseJobWakeup } from "@damatjs/jobs";
import type { Redis } from "@damatjs/redis";
import type { WakeupTargets } from "./wakeupTargets";

export class WorkerWakeupSubscriber {
  private subscriber: Redis | undefined;

  constructor(
    private readonly redis: Redis,
    private readonly targets: WakeupTargets,
  ) {}

  async connect(): Promise<void> {
    const subscriber = this.redis.duplicate();
    this.subscriber = subscriber;
    subscriber.on("message", this.onMessage);
    try {
      await subscriber.subscribe(JOB_WAKEUP_CHANNEL, EVENT_WAKEUP_CHANNEL);
    } catch (cause) {
      throw new Error("SUBSCRIBE durability wake-up channels failed", { cause });
    }
  }

  async close(): Promise<void> {
    const subscriber = this.subscriber;
    this.subscriber = undefined;
    if (!subscriber) return;
    subscriber.off("message", this.onMessage);
    try {
      await subscriber.unsubscribe(JOB_WAKEUP_CHANNEL, EVENT_WAKEUP_CHANNEL);
    } catch {}
    try {
      await subscriber.quit();
    } catch {}
  }

  private readonly onMessage = (channel: string, message: string): void => {
    const job =
      channel === JOB_WAKEUP_CHANNEL ? parseJobWakeup(message) : undefined;
    if (job) return this.targets.job?.wake();
    const event =
      channel === EVENT_WAKEUP_CHANNEL
        ? parseEventWakeup(message)
        : undefined;
    if (event?.target === "router") this.targets.router?.wake();
    if (event?.target === "delivery") this.targets.event?.wake();
  };
}
