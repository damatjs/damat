import type { HealthCheckFn } from "../types";
import type { ModuleInstance } from "@damatjs/services";
import type { AuthRuntime } from "./auth";
import type { ResolvedModule } from "@damatjs/installer";
import type { ShutdownRegistration } from "../shutdown/types";
import type { DurabilityCoordinator } from "@damatjs/durability";

export interface ServiceInstances {
  healthChecks?: Record<string, HealthCheckFn | undefined> | undefined;
  shutdownHandlers: ShutdownRegistration[];
  modules?: Map<string, ModuleInstance<any>>;
  resolvedModules?: Map<string, ResolvedModule>;
  /** Built auth wiring when `providers.auth` is configured. */
  authRuntime?: AuthRuntime;
  /** Role bindings pointing at the exact initialized module service objects. */
  providers?: Map<string, unknown>;
  durabilityCoordinator?: DurabilityCoordinator;
}
