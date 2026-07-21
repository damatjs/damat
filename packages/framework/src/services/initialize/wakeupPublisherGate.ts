import {
  clearEventWakeupPublisher,
  configureEventWakeupPublisher,
} from "@damatjs/events";
import {
  clearJobWakeupPublisher,
  configureJobWakeupPublisher,
} from "@damatjs/jobs";
import type { Redis } from "@damatjs/redis";
import {
  clearPipelineWakeupPublisher,
  configurePipelineWakeupPublisher,
} from "@damatjs/pipelines";

export class WakeupPublisherGate {
  constructor(
    private readonly redis: Redis,
    private readonly onError: (error: unknown) => Promise<void>,
  ) {}

  enable(): void {
    configureJobWakeupPublisher(this.publisher);
    configureEventWakeupPublisher(this.publisher);
    configurePipelineWakeupPublisher(this.publisher);
  }

  disable(): void {
    clearJobWakeupPublisher();
    clearEventWakeupPublisher();
    clearPipelineWakeupPublisher();
  }

  private readonly publisher = {
    publish: async (channel: string, message: string): Promise<number> => {
      try {
        return await this.redis.publish(channel, message);
      } catch (cause) {
        const error = new Error(`PUBLISH ${channel} failed`, { cause });
        await this.onError(error);
        return 0;
      }
    },
  };
}
