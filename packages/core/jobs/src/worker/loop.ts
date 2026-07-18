import type { JobWorkerOptions } from "./types";
import { workerDependencies } from "./dependencies";
import { JobWorkerRuntime } from "./runtime";

export class JobWorker {
  readonly id: string;
  #runtime: JobWorkerRuntime;

  constructor(options: JobWorkerOptions = {}) {
    this.#runtime = new JobWorkerRuntime(options, workerDependencies);
    this.id = this.#runtime.id;
  }

  start(): void {
    this.#runtime.start();
  }

  stop(options: { graceMs?: number } = {}): Promise<void> {
    return this.#runtime.stop(options);
  }

  get isRunning(): boolean {
    return this.#runtime.isRunning;
  }

  get inFlight(): number {
    return this.#runtime.inFlight;
  }

  wake(): void {
    this.#runtime.wake();
  }
}
