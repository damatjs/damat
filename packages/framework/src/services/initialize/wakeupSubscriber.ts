import { EVENT_WAKEUP_CHANNEL, parseEventWakeup } from "@damatjs/events";
import { JOB_WAKEUP_CHANNEL, parseJobWakeup } from "@damatjs/jobs";
import {
  PIPELINE_WAKEUP_CHANNEL,
  parsePipelineWakeup,
} from "@damatjs/pipelines";
import type { Redis } from "@damatjs/redis";
import type { WakeupTargets } from "./wakeupTargets";

export class WorkerWakeupSubscriber {
  private subscriber: Redis | undefined;
  private readonly channels: string[];

  constructor(
    private readonly redis: Redis,
    private readonly targets: WakeupTargets,
  ) {
    this.channels = [
      ...(targets.job || targets.pipeline ? [JOB_WAKEUP_CHANNEL] : []),
      ...(targets.router || targets.event || targets.pipeline
        ? [EVENT_WAKEUP_CHANNEL]
        : []),
      ...(targets.pipeline ? [PIPELINE_WAKEUP_CHANNEL] : []),
    ];
  }

  async connect(): Promise<void> {
    const subscriber = this.redis.duplicate();
    this.subscriber = subscriber;
    subscriber.on("message", this.onMessage);
    try {
      if (this.channels.length) await subscriber.subscribe(...this.channels);
    } catch (cause) {
      throw new Error("SUBSCRIBE durability wake-up channels failed", {
        cause,
      });
    }
  }

  async close(): Promise<void> {
    const subscriber = this.subscriber;
    this.subscriber = undefined;
    if (!subscriber) return;
    subscriber.off("message", this.onMessage);
    try {
      if (this.channels.length) await subscriber.unsubscribe(...this.channels);
    } catch {}
    try {
      await subscriber.quit();
    } catch {}
  }

  private readonly onMessage = (channel: string, message: string): void => {
    const job =
      channel === JOB_WAKEUP_CHANNEL ? parseJobWakeup(message) : undefined;
    if (job) {
      this.targets.job?.wake();
      this.targets.pipeline?.worker.wake();
      return;
    }
    const event =
      channel === EVENT_WAKEUP_CHANNEL ? parseEventWakeup(message) : undefined;
    if (event?.target === "router") this.targets.router?.wake();
    if (event?.target === "delivery") this.targets.event?.wake();
    if (event) this.targets.pipeline?.router.wake();
    const pipeline =
      channel === PIPELINE_WAKEUP_CHANNEL
        ? parsePipelineWakeup(message)
        : undefined;
    if (pipeline) this.targets.pipeline?.router.wake();
  };
}
