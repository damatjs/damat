import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import {
  generateFilesMap,
  generateCrudScaffold,
  resolveServiceClassName,
  registryAugmentation,
} from "@damatjs/orm-codegen";
import { toModuleSchema } from "@damatjs/orm-model";
import { discoverModels } from "@damatjs/orm-migration";
import type { ILogger } from "@damatjs/logger";
import { readModuleManifest } from "../manifest/read";
import { DEFAULT_MODULE_PATHS } from "../manifest/types";
import { locateModuleDir } from "../runtime/locate";

export interface ModuleCodegenResult {
  outputDir: string;
  files: string[];
  /** CRUD scaffold files newly created this run (scaffold-once). */
  scaffolded: string[];
}

/**
 * Generate TypeScript row types + zod schemas for a standalone module
 * package — no damat.config.ts required.
 */
export async function generateModuleTypes(
  packageDir: string,
  logger: ILogger,
): Promise<ModuleCodegenResult> {
  const moduleDir = locateModuleDir(packageDir);
  const manifest = readModuleManifest(moduleDir);

  const models = await discoverModels(moduleDir);
  const schema = toModuleSchema(manifest.name, models);
  const filesMap = generateFilesMap(schema, {}, logger);

  const outputDir = join(
    moduleDir,
    manifest.paths?.types ?? DEFAULT_MODULE_PATHS.types,
  );
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const files: string[] = [];
  for (const [fileName, content] of filesMap) {
    writeFileSync(join(outputDir, fileName), content, "utf-8");
    files.push(fileName);
  }

  // Generated module-registry augmentation: makes `getModule("<id>")` resolve
  // to the typed service everywhere — no `as any`, no manual cast. Overwritten
  // every run (it is type-only). The service class is read from `service.ts`.
  const serviceClass = resolveServiceClassName(moduleDir, manifest.name);
  writeFileSync(
    join(outputDir, "registry.ts"),
    registryAugmentation(manifest.name, serviceClass),
    "utf-8",
  );
  files.push("registry.ts");

  // Scaffold the per-operation CRUD slice (steps + workflows + split routes)
  // alongside the types. Module-mode output roots live inside the module so
  // the install-splitter can later relocate api/ and workflows/ into the app.
  // Scaffold-once: existing files are never overwritten.
  const scaffold = generateCrudScaffold(
    schema,
    {
      moduleId: manifest.name,
      routesRoot: join(moduleDir, "api", "routes"),
      workflowsRoot: join(
        moduleDir,
        manifest.paths?.workflows ?? DEFAULT_MODULE_PATHS.workflows,
      ),
      typesDir: outputDir,
    },
    logger,
  );

  return { outputDir, files, scaffolded: scaffold.created };
}
