import { getLogger } from "@damatjs/logger";
import type { WorkerDependencies } from "./dependencies";
import { WorkerLifecycle } from "./lifecycle";
import { resolveWorkerOptions } from "./options";
import { WorkerRuntimeComponents } from "./runtime-components";
import type { JobWorkerOptions } from "./types";
import { validateStopGrace } from "./validate-options";

export class JobWorkerRuntime {
  readonly id: string;
  private registered = false;
  private bootTask?: Promise<void>;
  private readonly lifecycle = new WorkerLifecycle();
  private readonly options;
  private readonly components: WorkerRuntimeComponents;

  constructor(
    options: JobWorkerOptions,
    private readonly deps: WorkerDependencies,
  ) {
    this.options = resolveWorkerOptions(options);
    this.id = this.options.workerId ?? crypto.randomUUID();
    this.components = new WorkerRuntimeComponents(
      this.id,
      this.options,
      deps,
      () => void this.finalizeBackground(),
      () => this.lifecycle.running,
    );
  }

  start(): void {
    if (!this.lifecycle.start()) return;
    this.bootTask = this.boot();
    void this.bootTask.catch((error) => {
      this.lifecycle.failStart();
      getLogger().error("Job worker failed to start", error);
    });
  }

  stop(options: { graceMs?: number } = {}): Promise<void> {
    validateStopGrace(options.graceMs);
    return this.lifecycle.stop(() =>
      this.stopInternal(options.graceMs ?? 30_000),
    );
  }

  get isRunning(): boolean {
    return this.lifecycle.running;
  }

  private async boot(): Promise<void> {
    await this.deps.register({
      id: this.id,
      queue: this.options.queue,
      concurrency: this.options.concurrency,
    });
    this.registered = true;
    if (!this.lifecycle.running) return;
    this.components.start();
  }

  private async stopInternal(graceMs: number): Promise<void> {
    await this.components.stopClaims();
    await this.bootTask?.catch(() => {});
    if (!this.registered) {
      await this.components.stopMaintenance();
      return this.lifecycle.completeStop();
    }
    try {
      await this.components.shutdown.begin(graceMs);
    } finally {
      await this.components.stopMaintenance();
    }
    if (this.components.shutdown.isStopped) this.lifecycle.completeStop();
  }

  private async finalizeBackground(): Promise<void> {
    try {
      await this.components.shutdown.onEmpty();
      if (this.components.shutdown.isStopped) this.lifecycle.completeStop();
    } catch (error) {
      getLogger().error("Job worker background finalization failed", error);
    }
  }
}
