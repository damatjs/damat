export interface HealthCheckFn {
  (): Promise<{ status: string; latency?: number }>;
}

export interface HealthCheckOptions {
  checks?:
    | {
        database?: HealthCheckFn;
        redis?: HealthCheckFn;
      }
    | undefined;
  version?: string | undefined;
}
