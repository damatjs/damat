export interface JobMap {}

export type JobName = (keyof JobMap & string) | (string & {});
export type JobPayload<K extends string> = K extends keyof JobMap
  ? JobMap[K]
  : unknown;

export type JobHandler<T = unknown> = (
  payload: T,
  context: unknown,
) => unknown | Promise<unknown>;

export interface JobOptions {
  queue?: string;
  priority?: number;
  maxAttempts?: number;
  backoffMs?: number;
  backoffMultiplier?: number;
}

export interface ResolvedJobOptions {
  queue: string;
  priority: number;
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface JobDefinition<T = unknown> {
  name: string;
  handler: JobHandler<T>;
  options: ResolvedJobOptions;
}
