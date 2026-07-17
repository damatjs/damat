import { startEventWakeupSubscriber } from "../wakeup/subscriber";
import type { StopEventWakeupSubscriber } from "../wakeup/types";
import type { ResolvedEventWorkerOptions } from "./runtime-options";

export class EventWorkerWakeupLifecycle {
  private enabled = false;
  private startTask?: Promise<void>;
  private stopSubscription: StopEventWakeupSubscriber | undefined;

  constructor(
    private readonly options: ResolvedEventWorkerOptions,
    private readonly wake: () => void,
  ) {}

  start(): void {
    if (!this.options.wakeupRedis) return;
    this.enabled = true;
    this.startTask = startEventWakeupSubscriber(
      this.options.wakeupRedis,
      (message) => {
        if (message.target !== "delivery") return;
        const selected = this.options.consumers.some(
          ({ event, consumer }) =>
            event === message.event && consumer === message.consumer,
        );
        if (selected) this.wake();
      },
    ).then(async (stop) => {
      if (this.enabled) this.stopSubscription = stop;
      else await stop();
    });
  }

  async stop(): Promise<void> {
    this.enabled = false;
    await this.startTask;
    await this.stopSubscription?.();
    this.stopSubscription = undefined;
  }
}
