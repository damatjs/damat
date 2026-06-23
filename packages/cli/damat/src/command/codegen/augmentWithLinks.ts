import { pathToFileURL } from "node:url";
import { renderLinkAugmentations, type ResolvedLinkField } from "@damatjs/link";

type ModuleEntry = { resolve: string; kind?: string };
type ModuleContainer = Record<string, ModuleEntry>;


/**
 * Weave cross-module link fields into a module's generated types: for each link
 * this module participates in, add the linked entity as an optional field on its
 * interface (sibling `<table>.links.ts` + a re-export from `index.ts`). No-op
 * when there are no link modules.
 */
export async function augmentWithLinks(
  args: {
    modules: ModuleContainer;
    moduleName: string;
    logger: { warn: (m: string) => void };
  },
  filesMap: Map<string, string>,
): Promise<void> {
  const { modules, moduleName, logger } = args;
  const linkModules = Object.values(modules).filter((m) => m.kind === "link");
  if (linkModules.length === 0) return;

  try {
    const modelsCache = new Map<string, Record<string, any>>();
    const loadModels = async (resolve: string): Promise<Record<string, any>> => {
      const cached = modelsCache.get(resolve);
      if (cached) return cached;
      const mod = await import(pathToFileURL(resolve).href);
      const map = (mod.models ?? {}) as Record<string, any>;
      modelsCache.set(resolve, map);
      return map;
    };
    const tableOf = async (
      modId: string,
      key: string,
    ): Promise<string | undefined> => {
      const entry = modules[modId];
      if (!entry) return undefined;
      const map = await loadModels(entry.resolve);
      return map[key]?._tableName as string | undefined;
    };

    const allLinks: any[] = [];
    for (const lm of linkModules) {
      try {
        const mod = await import(pathToFileURL(lm.resolve).href);
        if (Array.isArray(mod.links)) allLinks.push(...mod.links);
      } catch (e) {
        logger.warn(`Could not load links from ${lm.resolve}: ${String(e)}`);
      }
    }

    const fields: ResolvedLinkField[] = [];
    for (const link of allLinks) {
      for (const [self, other] of [
        [link.left, link.right],
        [link.right, link.left],
      ] as const) {
        if (self.module !== moduleName) continue;
        const localTable = await tableOf(self.module, self.model);
        const otherTable = await tableOf(other.module, other.model);
        const otherEntry = modules[other.module];
        if (!localTable || !otherTable || !otherEntry) continue;

        // Cross-module import via the OTHER module's portable alias — resolves
        // the same regardless of where each module's types sit in the app tree
        // (`@<other>/* → ./src/modules/<other>/*`), instead of a brittle
        // `../../<other>/types` relative hop.
        const importPath = `@${other.module}/types`;

        fields.push({
          localTable,
          field: other.alias ?? other.model,
          otherTable,
          importPath,
          isList: other.isList ?? true,
        });
      }
    }

    if (fields.length === 0) return;

    const banner =
      "// This file is auto-generated. Do not edit it manually.\n" +
      "// Re-generate by running: bun run codegen\n";
    const indexExports: string[] = [];
    for (const aug of renderLinkAugmentations(fields, banner)) {
      filesMap.set(aug.fileName, aug.content);
      indexExports.push(`export * from "./${aug.indexExport}";`);
    }
    const index = filesMap.get("index.ts") ?? "";
    filesMap.set("index.ts", `${index}${indexExports.join("\n")}\n`);
  } catch (e) {
    logger.warn(
      `Link type augmentation skipped: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

