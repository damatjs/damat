export type AccelerationMode = "healthy" | "degraded" | "disabled";

export interface DurabilityCoordinatorOptions {
  mode?: AccelerationMode;
  healthySafetyPollIntervalMs?: number;
  degradedMaxPollIntervalMs?: number;
}

export interface DurabilityCoordinator {
  readonly mode: AccelerationMode;
  setMode(mode: AccelerationMode): void;
  pollInterval(fallbackMs: number): number;
  run<T>(key: string, operation: () => Promise<T>): Promise<T>;
}
