import type {
  AccelerationMode,
  DurabilityCoordinator,
  DurabilityCoordinatorOptions,
} from "./types";

const positive = (value: number, name: string) => {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return value;
};

export class ProcessDurabilityCoordinator implements DurabilityCoordinator {
  private currentMode: AccelerationMode;
  private readonly healthyMs: number;
  private readonly degradedMs: number;
  private tail: Promise<unknown> = Promise.resolve();
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(options: DurabilityCoordinatorOptions = {}) {
    this.currentMode = options.mode ?? "disabled";
    this.healthyMs = positive(
      options.healthySafetyPollIntervalMs ?? 30_000,
      "healthySafetyPollIntervalMs",
    );
    this.degradedMs = positive(
      options.degradedMaxPollIntervalMs ?? 5_000,
      "degradedMaxPollIntervalMs",
    );
  }

  get mode(): AccelerationMode {
    return this.currentMode;
  }

  setMode(mode: AccelerationMode): void {
    this.currentMode = mode;
  }

  pollInterval(fallbackMs: number): number {
    if (this.currentMode === "healthy") return this.healthyMs;
    return Math.min(fallbackMs, this.degradedMs);
  }

  run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const active = this.pending.get(key);
    if (active) return active as Promise<T>;
    const task = this.tail.then(operation);
    this.pending.set(key, task);
    const finish = () => {
      if (this.pending.get(key) === task) this.pending.delete(key);
    };
    this.tail = task.then(finish, finish);
    return task;
  }
}
