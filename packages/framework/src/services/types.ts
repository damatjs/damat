import type { HealthCheckFn } from "../types";
import type { ModuleInstance } from "@damatjs/services";
import type { AuthRuntime } from "./auth";
import type { ResolvedModule } from "@damatjs/installer";
import type { ShutdownRegistration } from "../shutdown/types";
import type { DurabilityCoordinator } from "@damatjs/durability";

export interface ServiceInstances {
  healthChecks?:
    | {
        database?: HealthCheckFn;
        redis?: HealthCheckFn;
      }
    | undefined;
  shutdownHandlers: ShutdownRegistration[];
  modules?: Map<string, ModuleInstance<any>>;
  resolvedModules?: Map<string, ResolvedModule>;
  /** Built auth wiring when `services.auth` is configured (see {@link AuthRuntime}). */
  auth?: AuthRuntime;
  durabilityCoordinator?: DurabilityCoordinator;
}
