import { DurableEventWorkerRuntime } from "./runtime";
import type { DurableEventWorkerOptions } from "./runtime-options";

export class DurableEventWorker {
  readonly id: string;
  readonly #runtime: DurableEventWorkerRuntime;

  constructor(options: DurableEventWorkerOptions) {
    this.#runtime = new DurableEventWorkerRuntime(options);
    this.id = this.#runtime.id;
  }

  start(): void {
    this.#runtime.start();
  }

  stop(options: { graceMs?: number } = {}): Promise<void> {
    return this.#runtime.stop(options.graceMs);
  }

  get isRunning(): boolean {
    return this.#runtime.isRunning;
  }
}
