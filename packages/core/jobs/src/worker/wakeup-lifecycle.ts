import { getLogger } from "@damatjs/logger";
import type { JobWakeupRedis, StopJobWakeupSubscriber } from "../wakeup";
import type { WorkerDependencies } from "./dependencies";

export class WorkerWakeupLifecycle {
  private enabled = false;
  private startTask: Promise<void> | undefined;
  private stopSubscription: StopJobWakeupSubscriber | undefined;

  constructor(
    private readonly redis: JobWakeupRedis | undefined,
    private readonly dependencies: WorkerDependencies,
    private readonly wake: (queue: string) => void,
  ) {}

  start(): void {
    if (!this.redis) return;
    this.enabled = true;
    this.startTask = this.dependencies
      .subscribeWakeups(this.redis, this.wake)
      .then(async (stop) => {
        if (this.enabled) this.stopSubscription = stop;
        else await stop();
      })
      .catch((error) => {
        getLogger().warn("Job wake-up lifecycle failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      });
  }

  async stop(): Promise<void> {
    this.enabled = false;
    await this.startTask;
    await this.stopSubscription?.();
    this.stopSubscription = undefined;
  }
}
