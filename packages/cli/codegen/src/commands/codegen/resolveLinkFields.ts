import { pathToFileURL } from "node:url";
import type { CliLogger } from "@damatjs/cli";
import type { ResolvedLinkField } from "@damatjs/link";
import { discoverModels } from "@damatjs/orm-migration";
import type { ModuleContainer } from "./constant";

export async function resolveLinkFields(
  modules: ModuleContainer,
  moduleName: string,
  logger: Pick<CliLogger, "warn">,
): Promise<ResolvedLinkField[]> {
  const modelCache = new Map<string, Record<string, any>>();
  const loadModels = async (resolve: string): Promise<Record<string, any>> => {
    const cached = modelCache.get(resolve);
    if (cached) return cached;
    let models: Record<string, any> = {};
    try {
      const loaded = await import(pathToFileURL(resolve).href);
      if (loaded.models && typeof loaded.models === "object")
        models = loaded.models;
    } catch {
      // provider directories without an index are scanned below
    }
    for (const model of await discoverModels(resolve))
      models[model._tableName] ??= model;
    modelCache.set(resolve, models);
    return models;
  };
  const tableOf = async (
    moduleId: string,
    model: string,
  ): Promise<string | undefined> => {
    const entry = modules[moduleId];
    if (!entry) return undefined;
    return (await loadModels(entry.models ?? entry.entry ?? entry.resolve))[
      model
    ]?._tableName;
  };
  const links: any[] = [];
  for (const entry of Object.values(modules).filter(
    ({ kind }) => kind === "link",
  )) {
    try {
      const loaded = await import(pathToFileURL(entry.resolve).href);
      if (Array.isArray(loaded.links)) links.push(...loaded.links);
    } catch (error) {
      logger.warn(
        `Could not load links from ${entry.resolve}: ${String(error)}`,
      );
    }
  }
  const fields: ResolvedLinkField[] = [];
  for (const link of links)
    for (const [self, other] of [
      [link.left, link.right],
      [link.right, link.left],
    ] as const) {
      if (self.module !== moduleName) continue;
      const localTable = await tableOf(self.module, self.model);
      const otherTable = await tableOf(other.module, other.model);
      if (!localTable || !otherTable || !modules[other.module]) continue;
      fields.push({
        localTable,
        field: other.alias ?? other.model,
        otherTable,
        importPath: `@${other.module}/types`,
        isList: other.isList ?? true,
      });
    }
  return fields;
}
