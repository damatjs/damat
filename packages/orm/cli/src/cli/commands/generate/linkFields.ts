import type { OrmModuleContainer } from "@/cli/types";
import { resolveTypesPath } from "@/cli/utils";
import type { ResolvedLinkField } from "@damatjs/link";
import { relative } from "node:path";
import { pathToFileURL } from "node:url";

export type WarningContext = { logger: { warn: (message: string) => void } };

export async function resolveLinkFields(
  ctx: WarningContext,
  modules: OrmModuleContainer,
  moduleName: string,
  moduleConfig: OrmModuleContainer[string],
): Promise<ResolvedLinkField[]> {
  const cache = new Map<string, Record<string, any>>();
  const loadModels = async (resolver: string): Promise<Record<string, any>> => {
    const cached = cache.get(resolver);
    if (cached) return cached;
    const loaded = await import(pathToFileURL(resolver).href);
    const models = (loaded.models ?? {}) as Record<string, any>;
    cache.set(resolver, models);
    return models;
  };
  const tableOf = async (moduleId: string, key: string) => {
    const entry = modules[moduleId];
    if (!entry) return undefined;
    return (await loadModels(entry.resolve))[key]?._tableName as
      string | undefined;
  };
  const links = await loadLinks(ctx, modules);
  const fields: ResolvedLinkField[] = [];
  const localTypesDir = resolveTypesPath(moduleConfig.resolve);
  for (const link of links) {
    for (const [self, other] of [
      [link.left, link.right],
      [link.right, link.left],
    ] as const) {
      if (self.module !== moduleName) continue;
      const localTable = await tableOf(self.module, self.model);
      const otherTable = await tableOf(other.module, other.model);
      const otherEntry = modules[other.module];
      if (!localTable || !otherTable || !otherEntry) continue;
      let importPath = relative(
        localTypesDir,
        resolveTypesPath(otherEntry.resolve),
      ).replace(/\\/g, "/");
      if (!importPath.startsWith(".")) importPath = `./${importPath}`;
      fields.push({
        localTable,
        field: other.alias ?? other.model,
        otherTable,
        importPath,
        isList: other.isList ?? true,
      });
    }
  }
  return fields;
}

async function loadLinks(
  ctx: WarningContext,
  modules: OrmModuleContainer,
): Promise<any[]> {
  const links: any[] = [];
  for (const module of Object.values(modules).filter(
    (m) => m.kind === "link",
  )) {
    try {
      const loaded = await import(pathToFileURL(module.resolve).href);
      if (Array.isArray(loaded.links)) links.push(...loaded.links);
    } catch (error) {
      ctx.logger.warn(`Could not load links from ${module.resolve}: ${error}`);
    }
  }
  return links;
}
