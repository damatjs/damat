import { OrmModuleContainer } from "@/cli/types";
import { resolveModelsPath, resolveTypesPath } from "@/cli/utils";
import { loadModules } from "@/cli/utils/load";
import { type Command } from "@damatjs/cli";
import type { ResolvedLinkField } from "@damatjs/link";

const generateTypes: Command = {
  name: "generate:types",
  description: "Generate TypeScript types for a module",
  handler: async (ctx) => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const {
      generateFilesMap,
      generateCrudScaffold,
      resolveServiceClassName,
      registryAugmentation,
    } = await import("@damatjs/orm-codegen");
    const { toModuleSchema } = await import("@damatjs/orm-model");
    const { discoverModels } = await import("@damatjs/orm-migration");
    const moduleName = ctx.args[0];

    if (!moduleName) {
      ctx.logger.error("Module name is required");
      return { exitCode: 1 };
    }

    // Load modules from damat.config.ts
    let modules: OrmModuleContainer;
    try {
      modules = await loadModules("damat.config.ts", ctx.cwd);
    } catch (error) {
      ctx.logger.error(
        `Failed to load config: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { exitCode: 1 };
    }

    if (!modules || Object.keys(modules).length === 0) {
      ctx.logger.error("No modules found in 'damat.config.ts'");
      return { exitCode: 1 };
    }

    const moduleConfig = modules[moduleName];
    if (!moduleConfig) {
      ctx.logger.error(`Module '${moduleName}' not found in config`);
      return { exitCode: 1 };
    }

    // Link directories don't generate their own (junction) types — their
    // relationships are surfaced by extending the *linked* modules' types.
    if (moduleConfig.kind === "link") {
      ctx.logger.info(
        `'${moduleName}' is a link module; run generate:types for the linked modules to get the linked fields.`,
      );
      return { exitCode: 0 };
    }

    // Verify models directory exists
    const resolvedModelsDir = resolveModelsPath(moduleConfig.resolve);
    if (!fs.existsSync(resolvedModelsDir)) {
      ctx.logger.error(`Models directory not found: ${resolvedModelsDir}`);
      return { exitCode: 1 };
    }

    try {
      ctx.logger.info(`Generating types for module '${moduleName}'...`);

      const models = await discoverModels(moduleConfig.resolve);

      // Build the ModuleSchema from model definitions
      const schema = toModuleSchema(moduleName, models);

      // Generate a file-per-table map  (includes index.ts + per-table files)
      const filesMap = generateFilesMap(schema, {}, ctx.logger);

      // Extend the generated types with cross-module links: for every link this
      // module participates in, add the linked entity as a field on its type
      // (e.g. Users gains `organizations?: Organizations[]`) via a sibling
      // <table>.links.ts that augments the base interface.
      await augmentWithLinks(ctx, modules, moduleName, moduleConfig, filesMap);

      // Write every generated file to {moduleResolver}/types/
      const outputDir = resolveTypesPath(moduleConfig.resolve);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      for (const [fileName, content] of filesMap) {
        const outputPath = path.join(outputDir, fileName);
        fs.writeFileSync(outputPath, content, "utf-8");
      }

      // App-mode CRUD scaffold: a model written inside an app gets the same
      // route → workflow → step → service slice as a standalone module. Routes
      // land in the app's `src/api/routes/<id>` and workflows in
      // `src/workflows/<id>` (where the framework actually mounts/uses them);
      // the model/service/types stay in the module. Scaffold-once — existing
      // files are never overwritten. Plus the `ModuleRegistry` augmentation so
      // `getModule("<id>")` is typed (no `as any`).
      try {
        const scaffold = generateCrudScaffold(
          schema,
          {
            moduleId: moduleName,
            routesRoot: path.join(ctx.cwd, "src", "api", "routes"),
            workflowsRoot: path.join(ctx.cwd, "src", "workflows", moduleName),
            typesDir: outputDir,
          },
          ctx.logger,
        );
        if (scaffold.created.length > 0) {
          ctx.logger.success(
            `Scaffolded ${scaffold.created.length} CRUD files (steps, workflows, routes)`,
          );
        }
        const serviceClass = resolveServiceClassName(
          moduleConfig.resolve,
          moduleName,
        );
        fs.writeFileSync(
          path.join(outputDir, "registry.ts"),
          registryAugmentation(moduleName, serviceClass),
          "utf-8",
        );
      } catch (e) {
        ctx.logger.warn(
          `CRUD scaffold skipped: ${e instanceof Error ? e.message : String(e)}`,
        );
      }

      ctx.logger.info(`Output: ${outputDir}`);
      ctx.logger.info(`Files: ${Array.from(filesMap.keys()).join(", ")}`);
      ctx.logger.success("Types generated successfully");

      return { exitCode: 0 };
    } catch (error) {
      ctx.logger.error(
        `Failed to generate types: ${error instanceof Error ? error.message : error}`,
      );
      return { exitCode: 1 };
    }
  },
};

/**
 * Weave cross-module link fields into a module's generated types.
 *
 * For each link the module participates in, adds the linked entity as an
 * optional field on the module's entity interface (sibling `<table>.links.ts`
 * with declaration merging) and re-exports it from the types index. No-op when
 * there are no link directories — keeps `generate:types` model-only otherwise.
 */
async function augmentWithLinks(
  ctx: { logger: { warn: (m: string) => void } },
  modules: OrmModuleContainer,
  moduleName: string,
  moduleConfig: OrmModuleContainer[string],
  filesMap: Map<string, string>,
): Promise<void> {
  const linkModules = Object.values(modules).filter((m) => m.kind === "link");
  if (linkModules.length === 0) return;

  try {
    const { pathToFileURL } = await import("node:url");
    const path = await import("node:path");
    const { renderLinkAugmentations } = await import("@damatjs/link");

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

    // Aggregate every declared link.
    const allLinks: any[] = [];
    for (const lm of linkModules) {
      try {
        const mod = await import(pathToFileURL(lm.resolve).href);
        if (Array.isArray(mod.links)) allLinks.push(...mod.links);
      } catch (e) {
        ctx.logger.warn(`Could not load links from ${lm.resolve}: ${String(e)}`);
      }
    }

    const localTypesDir = resolveTypesPath(moduleConfig.resolve);
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

        let rel = path
          .relative(localTypesDir, resolveTypesPath(otherEntry.resolve))
          .replace(/\\/g, "/");
        if (!rel.startsWith(".")) rel = `./${rel}`;

        fields.push({
          localTable,
          field: other.alias ?? other.model,
          otherTable,
          importPath: rel,
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
    ctx.logger.warn(
      `Link type augmentation skipped: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export default generateTypes;
