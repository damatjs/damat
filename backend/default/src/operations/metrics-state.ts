export const metrics = {
  startedAt: Date.now(),
  requests: 0,
  errors: 0,
  durationMs: 0,
};

export function resetMetrics(): void {
  metrics.startedAt = Date.now();
  metrics.requests = 0;
  metrics.errors = 0;
  metrics.durationMs = 0;
}
