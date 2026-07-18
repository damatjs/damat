import { getLogger } from "@damatjs/logger";
import { routePipelineCycle, type PipelineRouteCycle } from "../router/route";
import {
  resolvePipelineRouterOptions,
  type PipelineRouterOptions,
} from "./router-options";

export class PipelineRouter {
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;
  private inFlight: Promise<PipelineRouteCycle> | undefined;
  private wakeRequested = false;
  private lastRetentionAt = 0;
  private readonly options;

  constructor(options: PipelineRouterOptions = {}) {
    this.options = resolvePipelineRouterOptions(options);
  }

  get isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    void this.run();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.inFlight) {
      try {
        await this.inFlight;
      } catch {}
    }
  }

  wake(): void {
    if (!this.running) return;
    if (this.inFlight) {
      this.wakeRequested = true;
      return;
    }
    if (this.timer) clearTimeout(this.timer);
    void this.run();
  }

  private async run(): Promise<void> {
    if (!this.running) return;
    let delay = this.options.pollIntervalMs;
    let scheduledDelay = false;
    try {
      const now = Date.now();
      const retain =
        now - this.lastRetentionAt >= this.options.retentionIntervalMs;
      const route = () => routePipelineCycle(this.options.batchSize, retain);
      this.inFlight = this.options.coordinator
        ? this.options.coordinator.run("pipelines:router", route)
        : route();
      const result = await this.inFlight;
      if (result.count >= this.options.batchSize) delay = 0;
      else if (
        result.nextDelayMs !== undefined &&
        result.nextDelayMs <= delay
      ) {
        delay = result.nextDelayMs;
        scheduledDelay = true;
      }
      if (retain) this.lastRetentionAt = now;
    } catch (error) {
      delay = this.options.retryIntervalMs;
      getLogger().error("Pipeline router poll failed", error);
    } finally {
      this.inFlight = undefined;
      if (this.wakeRequested) {
        this.wakeRequested = false;
        delay = 0;
      }
      if (
        !scheduledDelay &&
        delay === this.options.pollIntervalMs &&
        this.options.coordinator
      ) {
        delay = this.options.coordinator.pollInterval(delay);
      }
      if (this.running) this.timer = setTimeout(() => void this.run(), delay);
    }
  }
}
