import { getLogger } from "@damatjs/logger";
import { startEventWakeupSubscriber } from "../wakeup/subscriber";
import type { StopEventWakeupSubscriber } from "../wakeup/types";
import { routeDurableEvents } from "./loop";
import {
  resolveRouterOptions,
  type DurableEventRouterOptions,
} from "./options";

export class DurableEventRouter {
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight: Promise<number> | undefined;
  private wakeRequested = false;
  private stopWakeup?: StopEventWakeupSubscriber;
  private startWakeup?: Promise<void>;
  private readonly options;

  constructor(options: DurableEventRouterOptions = {}) {
    this.options = resolveRouterOptions(options);
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    if (this.options.wakeupRedis) {
      this.startWakeup = startEventWakeupSubscriber(
        this.options.wakeupRedis,
        (message) => {
          if (message.target === "router") this.wake();
        },
      ).then(async (stop) => {
        if (this.running) this.stopWakeup = stop;
        else await stop();
      });
    }
    void this.run();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    await this.startWakeup;
    await this.stopWakeup?.();
    if (this.inFlight) {
      try {
        await this.inFlight;
      } catch {}
    }
  }

  wake(): void {
    if (!this.running) return;
    if (this.inFlight) return void (this.wakeRequested = true);
    if (this.timer) clearTimeout(this.timer);
    void this.run();
  }

  private async run(): Promise<void> {
    if (!this.running) return;
    let delay = this.options.pollIntervalMs;
    try {
      this.inFlight = routeDurableEvents({ limit: this.options.batchSize });
      const count = await this.inFlight;
      if (count === this.options.batchSize) delay = 0;
    } catch (error) {
      delay = this.options.retryIntervalMs;
      getLogger().error("Durable event router poll failed", error);
    } finally {
      this.inFlight = undefined;
      if (this.wakeRequested) {
        this.wakeRequested = false;
        delay = 0;
      }
      if (this.running) this.timer = setTimeout(() => void this.run(), delay);
    }
  }
}
