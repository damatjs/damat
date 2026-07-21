import { resolveLinkModuleEntries, setLinkModuleResolver } from "@damatjs/link";
import type { AppConfig } from "../../config";
import type { ServiceInstances } from "../types";
import {
  getAllModules,
  getModule,
  getResolvedModules,
  initModules,
} from "../moduleService";
import { loadModuleProviders } from "../moduleProviders";

export async function initializeModules(
  config: AppConfig,
  instances: ServiceInstances,
  cwd: string,
): Promise<void> {
  const modules = [
    ...Object.entries(config.modules ?? {}).map(([id, module]) => ({
      ...module,
      id: module.id ?? id,
    })),
    ...resolveLinkModuleEntries(config.links, cwd).map((entry) => ({
      id: entry.id,
      resolve: entry.resolve,
    })),
  ];
  if (modules.length) {
    await initModules(modules, cwd);
    instances.modules = getAllModules();
    instances.resolvedModules = getResolvedModules();
    await loadModuleProviders(instances.resolvedModules);
  }
  setLinkModuleResolver((id: string) => getModule(id));
}
