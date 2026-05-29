import type { HealthCheckFn } from "../types";
import type { ModuleInstance } from "@damatjs/services";

export interface ServiceInstances {
  healthChecks?: {
    database?: HealthCheckFn;
    redis?: HealthCheckFn;
  } | undefined;
  shutdownHandlers: Array<{ name: string; handler: () => Promise<void> }>;
  modules?: Map<string, ModuleInstance<any>>;
}
