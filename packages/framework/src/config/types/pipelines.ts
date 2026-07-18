import type { RetentionDuration } from "@damatjs/durability";

export interface PipelinesServiceConfig {
  /** Queue used by code-action and workflow nodes. */
  queue?: string;
  /** Concurrent internal action/workflow node executions. */
  concurrency?: number;
  /** Maximum graph advances in one router transaction. */
  routerBatchSize?: number;
  /** Definition validation ceiling for one run. */
  maxNodeActivationsPerRun?: number;
  /** Definition validation ceiling for foreach expansion. */
  maxFanOut?: number;
  /** Canonical run and pipeline-owned job history retention. */
  retentionMs?: RetentionDuration;
}
