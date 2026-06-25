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

    // Import specifiers (bare — directory imports resolve to the folder's
    // `index.ts` barrel):
    //   - types STAY inside the module                 → `@<id>/types`
    //     (resolves via `@<id>/*` → `./src/*` → `./src/types` → index)
    //   - workflow → step (same <table> subtree)       → relative `../steps/...`
    //     (the subtree relocates together, so the relative path survives install)
    //   - route → workflow (crosses api/routes↔workflows, where the relative
    //     depth changes on install) → the recursive barrel root `@workflows`
    //     (needs the NON-WILDCARD `"@workflows": ["./src/workflows"]` tsconfig
    //     entry the scaffold/install write, so it resolves to `src/workflows/index`)
    //   - same-directory siblings (./query, ./createX) → always relative (in templates)
    // The fallback (no aliases) keeps the legacy relative paths to each target dir.
    const typesAlias = aliases ? `${aliases.module}/types` : null;
    const wfBarrel = aliases ? `${aliases.workflows}` : null;

    const typesFromStep = typesAlias ?? spec(stepsDir, typesIndex);
    const typesFromWorkflow = typesAlias ?? spec(workflowsDir, typesIndex);
    const stepsFromWorkflow = spec(workflowsDir, stepsDir);
    const wfFromRoute = wfBarrel ?? spec(routeDir, workflowsDir);
    const typesFromRoute = typesAlias ?? spec(routeDir, typesIndex);
    const wfFromRouteId = wfBarrel ?? spec(routeIdDir, workflowsDir);
    const typesFromRouteId = typesAlias ?? spec(routeIdDir, typesIndex);

    // Steps
    writeOnce(join(stepsDir, `create${n.pascal}.ts`), T.stepCreate(n, typesFromStep));
    writeOnce(join(stepsDir, `update${n.pascal}.ts`), T.stepUpdate(n, typesFromStep));
    writeOnce(join(stepsDir, `delete${n.pascal}.ts`), T.stepDelete(n, typesFromStep));
    writeOnce(join(stepsDir, `find${n.pascal}.ts`), T.stepFind(n, typesFromStep));
    writeOnce(join(stepsDir, `findMany${n.pascal}.ts`), T.stepFindMany(n, typesFromStep));

    // Workflows
    writeOnce(join(workflowsDir, `create${n.pascal}.ts`), T.workflowCreate(n, typesFromWorkflow, stepsFromWorkflow));
    writeOnce(join(workflowsDir, `update${n.pascal}.ts`), T.workflowUpdate(n, typesFromWorkflow, stepsFromWorkflow));
    writeOnce(join(workflowsDir, `delete${n.pascal}.ts`), T.workflowDelete(n, typesFromWorkflow, stepsFromWorkflow));
    writeOnce(join(workflowsDir, `find${n.pascal}.ts`), T.workflowFind(n, typesFromWorkflow, stepsFromWorkflow));
    writeOnce(join(workflowsDir, `findMany${n.pascal}.ts`), T.workflowFindMany(n, typesFromWorkflow, stepsFromWorkflow));

    // Routes — collection
    writeOnce(join(routeDir, "api.ts"), T.routeCollectionApi(n, wfFromRoute, typesFromRoute));
    writeOnce(join(routeDir, "validator.ts"), T.routeCollectionValidator(n, typesFromRoute));
    writeOnce(join(routeDir, "query.ts"), T.routeCollectionQuery(n, typesFromRoute));
    writeOnce(join(routeDir, "middleware.ts"), T.routeMiddleware());
    writeOnce(join(routeDir, "route.ts"), T.routeCollectionRoute());

    // Routes — single resource ([id])
    writeOnce(join(routeIdDir, "api.ts"), T.routeIdApi(n, wfFromRouteId, typesFromRouteId));
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
