import path from "node:path";
import type { ModuleConfig } from "../config";
import type { ModuleInstance, ModuleRegistry } from "@damatjs/services";

const moduleRegistry = new Map<string, ModuleInstance<any>>();

function pathToFileURL(filePath: string): URL {
  const resolved = path.resolve(filePath);
  let urlPath = resolved;
  if (process.platform === "win32") {
    urlPath = resolved.replace(/\\/g, "/");
  }
  if (!urlPath.startsWith("/")) {
    urlPath = "/" + urlPath;
  }
  return new URL(`file://${urlPath}`);
}

export function registerModule(name: string, module: ModuleInstance<any>): void {
  const final = module.init() as any;
  moduleRegistry.set(name, final);
}

export function getModule<K extends keyof ModuleRegistry>(name: string): ModuleRegistry[K] | null {
  const instance = moduleRegistry.get(name as string);
  return instance as any ?? null;
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

    const moduleId = moduleConfig.id ?? path.basename(moduleConfig.resolve);

    registerModule(moduleId, moduleInstance);
  }
}
