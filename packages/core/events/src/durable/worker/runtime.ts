import { markWorkerStopping } from "@damatjs/durability";
import { getLogger } from "@damatjs/logger";
import { registerEventDeliveryWorker } from "./boot";
import { resolveEventWorkerOptions } from "./runtime-options";
import type { DurableEventWorkerOptions } from "./runtime-options";
import { EventWorkerRuntimeComponents } from "./runtime-components";
import { EventWorkerRuntimeFinalizer } from "./runtime-finalizer";
import { validateEventWorkerGrace } from "./stop-options";
import { finishEventWorkerBackground } from "./background-finalize";
type RuntimeState = "idle" | "running" | "stopping" | "stopped" | "failed";

export class DurableEventWorkerRuntime {
  readonly id: string;
  private state: RuntimeState = "idle";
  private registered = false;
  private bootTask?: Promise<void>;
  private stopTask: Promise<void> | undefined;
  private readonly options;
  private readonly components;
  private readonly finalizer;

  constructor(options: DurableEventWorkerOptions) {
    this.options = resolveEventWorkerOptions(options);
    this.id = this.options.workerId ?? crypto.randomUUID();
    this.components = new EventWorkerRuntimeComponents(
      this.id,
      this.options,
      () => void this.onEmpty(),
      () => this.state === "running",
    );
    this.finalizer = new EventWorkerRuntimeFinalizer(
      this.id,
      () => this.components.stopMaintenance(),
      () => void (this.state = "stopped"),
    );
  }

  get isRunning(): boolean {
    return this.state === "running";
  }

  get inFlight(): number {
    return this.components.active.size;
  }

  wake(): void {
    this.components.wake();
  }

  start(): void {
    if (this.state === "running") return;
    if (this.state !== "idle")
      throw new Error(`Event worker cannot restart while ${this.state}`);
    this.state = "running";
    this.bootTask = this.boot().catch((error) => {
      this.state = "failed";
      getLogger().error("Event worker failed to start", error);
    });
  }

  stop(graceMs = 30_000): Promise<void> {
    validateEventWorkerGrace(graceMs);
    if (this.state === "idle" || this.state === "stopped")
      return Promise.resolve();
    if (this.stopTask) return this.stopTask;
    this.state = "stopping";
    this.stopTask = this.stopInternal(graceMs).finally(() => {
      this.stopTask = undefined;
    });
    return this.stopTask;
  }

  private async boot(): Promise<void> {
    await registerEventDeliveryWorker(this.id, this.options);
    this.registered = true;
    if (this.state === "running") this.components.start();
  }

  private async stopInternal(graceMs: number): Promise<void> {
    await this.components.stopClaims();
    await this.bootTask;
    if (!this.registered) return void (this.state = "stopped");
    try {
      await markWorkerStopping({ id: this.id });
      let drained = await this.components.active.drain(graceMs);
      if (!drained) {
        this.finalizer.waitForDrain();
        this.components.active.abort();
        drained = await this.components.active.drain(50);
      }
      if (drained) await this.finalizer.finish();
    } finally {
      await this.components.stopMaintenance();
    }
  }

  private async onEmpty(): Promise<void> {
    await finishEventWorkerBackground(this.finalizer);
  }
}
