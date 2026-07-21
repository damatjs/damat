export interface JobsServiceConfig {
  /** Queue to claim (default "damat-jobs"). */
  queue?: string;
  /** Jobs processed simultaneously (default 1). */
  concurrency?: number;
}
