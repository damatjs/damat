import { join, relative, dirname } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import type { ModuleSchema } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import { getLogger } from "@damatjs/logger";
import { deriveNames, type CrudNames } from "./naming";
import * as T from "./templates";
import { CrudScaffoldOptions, CrudScaffoldResult } from './type';

/** Relative import specifier from a source directory to a target (no extension). */
function spec(fromDir: string, toNoExt: string): string {
  let rel = relative(fromDir, toNoExt).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  return rel;
}

/**
 * Generate the per-operation CRUD scaffold (steps + workflows + split routes)
 * for every table in `schema`. Files are written ONCE — existing files are
 * left untouched so hand edits survive regeneration. Mirrors how the layering
 * is meant to flow: route → workflow → step → service (CRUD only).
 */
export function generateCrudScaffold(
  schema: ModuleSchema,
  options: CrudScaffoldOptions,
  loggerData?: ILogger,
): CrudScaffoldResult {
  const logger = loggerData ?? getLogger();
  const { moduleId, routesRoot, workflowsRoot, typesDir, aliases } = options;
  const typesIndex = join(typesDir, "index");

  const result: CrudScaffoldResult = { created: [], skipped: [] };

  const writeOnce = (filePath: string, content: string) => {
    if (existsSync(filePath)) {
      result.skipped.push(filePath);
      return;
    }
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, "utf-8");
    result.created.push(filePath);
  };

  for (const table of schema.tables) {
    const n: CrudNames = deriveNames(moduleId, table);

    const wfResourceDir = join(workflowsRoot, n.fileBase);
    const stepsDir = join(wfResourceDir, "steps");
    const workflowsDir = join(wfResourceDir, "workflows");
    const routeDir = join(routesRoot, n.fileBase);
    const routeIdDir = join(routeDir, "[id]");

    // Import specifiers. With `aliases`, emit portable tsconfig-path specifiers
    // that survive the standalone→installed relocation; otherwise fall back to
    // the legacy relative paths computed from each source dir to its target.
    //   - types/service STAY inside the module      → `@<id>/...`
    //   - workflows/steps MOVE OUT (nested by id)    → `@workflows/<id>/<table>/...`
    //   - same-directory siblings (./api, ./createX) → always relative (in templates)
    const typesAlias = aliases ? `${aliases.module}/types/index` : null;
    const wfDirAlias = aliases
      ? `${aliases.workflows}/${moduleId}/${n.fileBase}/workflows`
      : null;
    const stepsDirAlias = aliases
      ? `${aliases.workflows}/${moduleId}/${n.fileBase}/steps`
      : null;

    const typesFromStep = typesAlias ?? spec(stepsDir, typesIndex);
    const typesFromWorkflow = typesAlias ?? spec(workflowsDir, typesIndex);
    const stepsFromWorkflow = stepsDirAlias ?? spec(workflowsDir, stepsDir);
    const wfFromRoute = wfDirAlias ?? spec(routeDir, workflowsDir);
    const typesFromRoute = typesAlias ?? spec(routeDir, typesIndex);
    const wfFromRouteId = wfDirAlias ?? spec(routeIdDir, workflowsDir);
    const typesFromRouteId = typesAlias ?? spec(routeIdDir, typesIndex);

    // Steps
    writeOnce(join(stepsDir, `create${n.pascal}.ts`), T.stepCreate(n, typesFromStep));
    writeOnce(join(stepsDir, `update${n.pascal}.ts`), T.stepUpdate(n, typesFromStep));
    writeOnce(join(stepsDir, `delete${n.pascal}.ts`), T.stepDelete(n, typesFromStep));
    writeOnce(join(stepsDir, `find${n.pascal}.ts`), T.stepFind(n, typesFromStep));
    writeOnce(join(stepsDir, `findMany${n.pascal}.ts`), T.stepFindMany(n, typesFromStep));
    writeOnce(join(stepsDir, "index.ts"), T.stepsIndex(n));

    // Workflows
    writeOnce(join(workflowsDir, `create${n.pascal}.ts`), T.workflowCreate(n, typesFromWorkflow, stepsFromWorkflow));
    writeOnce(join(workflowsDir, `update${n.pascal}.ts`), T.workflowUpdate(n, typesFromWorkflow, stepsFromWorkflow));
    writeOnce(join(workflowsDir, `delete${n.pascal}.ts`), T.workflowDelete(n, typesFromWorkflow, stepsFromWorkflow));
    writeOnce(join(workflowsDir, `find${n.pascal}.ts`), T.workflowFind(n, typesFromWorkflow, stepsFromWorkflow));
    writeOnce(join(workflowsDir, `findMany${n.pascal}.ts`), T.workflowFindMany(n, typesFromWorkflow, stepsFromWorkflow));
    writeOnce(join(workflowsDir, "index.ts"), T.workflowsIndex(n));

    // Routes — collection
    writeOnce(join(routeDir, "api.ts"), T.routeCollectionApi(n, wfFromRoute));
    writeOnce(join(routeDir, "validator.ts"), T.routeCollectionValidator(n, typesFromRoute));
    writeOnce(join(routeDir, "query.ts"), T.routeCollectionQuery(n, typesFromRoute));
    writeOnce(join(routeDir, "middleware.ts"), T.routeMiddleware());
    writeOnce(join(routeDir, "route.ts"), T.routeCollectionRoute());

    // Routes — single resource ([id])
    writeOnce(join(routeIdDir, "api.ts"), T.routeIdApi(n, wfFromRouteId));
    writeOnce(join(routeIdDir, "validator.ts"), T.routeIdValidator(n, typesFromRouteId));
    writeOnce(join(routeIdDir, "middleware.ts"), T.routeMiddleware());
    writeOnce(join(routeIdDir, "route.ts"), T.routeIdRoute());
  }

  logger.info("generateCrudScaffold completed", {
    moduleId,
    created: result.created.length,
    skipped: result.skipped.length,
  });

  return result;
}
