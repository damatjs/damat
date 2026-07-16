import type { ModuleConfig } from "../config";
import type { ModuleInstance, ModuleRegistry } from "@damatjs/services";
import { resolveModuleArtifact, type ResolvedModule } from "@damatjs/installer";
import { moduleLocationId } from "./moduleLocation";
import { pathToFileURL } from "node:url";

const moduleRegistry = new Map<string, ModuleInstance<any>>();
const resolvedModules = new Map<string, ResolvedModule>();

export function registerModule(
  name: string,
  module: ModuleInstance<any>,
): void {
  module.init();
  moduleRegistry.set(name, module);
}

/**
 * Get a registered module's service.
 *
 * Fully typed when the app augments ModuleRegistry:
 * ```ts
 * declare module "@damatjs/services" {
 *   interface ModuleRegistry { user: UserModuleService }
 * }
 * const users = getModule("user"); // UserModuleService | null
 * ```
 * Without augmentation, pass the type explicitly: `getModule<UserModuleService>("user")`.
 */
export function getModule<K extends keyof ModuleRegistry>(
  name: K,
): ModuleRegistry[K] | null;
export function getModule<T = unknown>(name: string): T | null;
export function getModule(name: string): unknown {
  const instance = moduleRegistry.get(name);
  return instance ? instance.service : null;
}

export function hasModule(name: string): boolean {
  return moduleRegistry.has(name);
}

export function clearModules(): void {
  moduleRegistry.clear();
  resolvedModules.clear();
}

export function getAllModules(): Map<string, ModuleInstance<any>> {
  return moduleRegistry;
}

export function getResolvedModules(): Map<string, ResolvedModule> {
  return resolvedModules;
}

export async function initModules(
  modules: ModuleConfig[],
  cwd: string,
): Promise<void> {
  for (const moduleConfig of modules) {
    const moduleId = moduleConfig.id ?? moduleLocationId(moduleConfig.resolve);
    const resolved = resolveModuleArtifact(moduleConfig.resolve, cwd, moduleId);
    const moduleImport = pathToFileURL(resolved.entry).href;
    const moduleExports = await import(moduleImport);
    const moduleInstance = moduleExports.default;

    if (!moduleInstance || typeof moduleInstance.init !== "function") {
      throw new Error(
        `Module at "${moduleImport}" must default-export the result of defineModule()`,
      );
    }

    registerModule(moduleId, moduleInstance);
    resolvedModules.set(moduleId, resolved);
  }
}
