import type { Pool } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import type { HealthCheckFn } from "../types";

export interface ServiceInstances {
  logger: ILogger;
  pool?: Pool | undefined;
  healthChecks?: {
    database?: HealthCheckFn;
    redis?: HealthCheckFn;
  } | undefined;
  shutdownHandlers: Array<{ name: string; handler: () => Promise<void> }>;
}
