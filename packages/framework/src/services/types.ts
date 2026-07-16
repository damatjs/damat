import type { HealthCheckFn } from "../types";
import type { ModuleInstance } from "@damatjs/services";
import type { AuthRuntime } from "./auth";
import type { ResolvedModule } from "@damatjs/installer";

export interface ServiceInstances {
  healthChecks?:
    | {
        database?: HealthCheckFn;
        redis?: HealthCheckFn;
      }
    | undefined;
  shutdownHandlers: Array<{ name: string; handler: () => Promise<void> }>;
  modules?: Map<string, ModuleInstance<any>>;
  resolvedModules?: Map<string, ResolvedModule>;
  /** Built auth wiring when `services.auth` is configured (see {@link AuthRuntime}). */
  auth?: AuthRuntime;
}
