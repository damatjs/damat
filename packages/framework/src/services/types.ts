import type { HealthCheckFn } from "../types";

export interface ServiceInstances {
  healthChecks?: {
    database?: HealthCheckFn;
    redis?: HealthCheckFn;
  } | undefined;
  shutdownHandlers: Array<{ name: string; handler: () => Promise<void> }>;
}
