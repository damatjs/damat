import type { ILogger } from "@damatjs/logger";
import {
  assertProviderBinding,
  assertProviderRoleMatch,
  type ProviderBindings,
  type ProviderRegistry,
} from "@damatjs/provider";
import { getModule } from "./moduleService";

const providers = new Map<string, unknown>();

export function bindProviders(
  bindings: ProviderBindings | undefined,
  logger?: ILogger,
): Map<string, unknown> {
  providers.clear();
  for (const [role, binding] of Object.entries(bindings ?? {})) {
    assertProviderBinding(role, binding);
    const service = getModule(binding.module);
    if (!service)
      throw new Error(
        `Provider "${role}" references missing module "${binding.module}"`,
      );
    assertProviderRoleMatch(role, service);
    providers.set(role, service);
    logger?.info("Provider role bound", { role, module: binding.module });
  }
  return providers;
}

export function getProvider<K extends keyof ProviderRegistry>(
  role: K,
): ProviderRegistry[K] | null;
export function getProvider<T = unknown>(role: string): T | null;
export function getProvider(role: string): unknown {
  return providers.get(role) ?? null;
}

export function getAllProviders(): Map<string, unknown> {
  return providers;
}

export function clearProviders(): void {
  providers.clear();
}
