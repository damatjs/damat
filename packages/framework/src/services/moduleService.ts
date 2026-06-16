import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ModuleConfig } from "../config";
import type { ModuleInstance, ModuleRegistry } from "@damatjs/services";

const moduleRegistry = new Map<string, ModuleInstance<any>>();

export function registerModule(name: string, module: ModuleInstance<any>): void {
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
}

export function getAllModules(): Map<string, ModuleInstance<any>> {
  return moduleRegistry;
}

export async function initModules(modules: ModuleConfig[], cwd: string): Promise<void> {
  for (const moduleConfig of modules) {
    const modulePath = path.resolve(cwd, moduleConfig.resolve);
    const moduleUrl = pathToFileURL(modulePath).href;

    const moduleExports = await import(moduleUrl);
    const moduleInstance = moduleExports.default;

    if (!moduleInstance || typeof moduleInstance.init !== "function") {
      throw new Error(
        `Module at "${moduleConfig.resolve}" must default-export the result of defineModule()`,
      );
    }

    const moduleId = moduleConfig.id ?? path.basename(moduleConfig.resolve);

    registerModule(moduleId, moduleInstance);
  }
}
