import type { OperationMetrics } from "./types";

const MAX_LATENCIES = 100;

/**
 * Metrics tracker for service operations
 */
export class MetricsTracker {
  private operationCounts: Map<string, number> = new Map();
  private operationLatencies: Map<string, number[]> = new Map();

  /**
   * Track an operation execution
   */
  async track<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      this.recordSuccess(operationName, Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordFailure(operationName, Date.now() - startTime);
      throw error;
    }
  }

  private recordSuccess(operation: string, latencyMs: number): void {
    const key = `${operation}:success`;
    this.operationCounts.set(key, (this.operationCounts.get(key) ?? 0) + 1);
    this.recordLatency(operation, latencyMs);
  }

  private recordFailure(operation: string, latencyMs: number): void {
    const key = `${operation}:failure`;
    this.operationCounts.set(key, (this.operationCounts.get(key) ?? 0) + 1);
    this.recordLatency(operation, latencyMs);
  }

  private recordLatency(operation: string, latencyMs: number): void {
    const latencies = this.operationLatencies.get(operation) ?? [];
    latencies.push(latencyMs);

    // Keep only last N latencies
    if (latencies.length > MAX_LATENCIES) {
      latencies.shift();
    }

    this.operationLatencies.set(operation, latencies);
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): OperationMetrics {
    const operations: OperationMetrics["operations"] = {};

    for (const [key, count] of this.operationCounts) {
      const operation = key.split(":")[0];
      if (!operation) continue;

      const latencies = this.operationLatencies.get(operation) ?? [];
      const avgLatencyMs =
        latencies.length > 0
          ? latencies.reduce((a, b) => a + b, 0) / latencies.length
          : 0;

      if (!operations[operation]) {
        operations[operation] = { count: 0, avgLatencyMs };
      }
      operations[operation].count += count;
    }

    return { operations };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.operationCounts.clear();
    this.operationLatencies.clear();
  }
}
