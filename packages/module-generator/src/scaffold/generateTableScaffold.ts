import type { TableSchema } from "@damatjs/orm-type";
import { join } from "node:path";
import { scaffoldImports } from "./importPaths";
import { deriveNames } from "./naming";
import * as T from "./templates";
import type { CrudScaffoldOptions, CrudScaffoldResult } from "./type";
import { writeOnce } from "./writeOnce";

export function generateTableScaffold(
  table: TableSchema,
  options: CrudScaffoldOptions,
  result: CrudScaffoldResult,
): void {
  const n = deriveNames(options.moduleId, table);
  const resourceDir = join(options.workflowsRoot, n.fileBase);
  const stepsDir = join(resourceDir, "steps");
  const workflowsDir = join(resourceDir, "workflows");
  const routeDir = join(options.routesRoot, n.fileBase);
  const routeIdDir = join(routeDir, "[id]");
  const paths = scaffoldImports({
    ...(options.aliases ? { aliases: options.aliases } : {}),
    typesIndex: join(options.typesDir, "index"),
    stepsDir,
    workflowsDir,
    routeDir,
    routeIdDir,
  });
  const files: Array<[string, string]> = [
    [
      join(stepsDir, `create${n.pascal}.ts`),
      T.stepCreate(n, paths.typesFromStep),
    ],
    [
      join(stepsDir, `update${n.pascal}.ts`),
      T.stepUpdate(n, paths.typesFromStep),
    ],
    [
      join(stepsDir, `delete${n.pascal}.ts`),
      T.stepDelete(n, paths.typesFromStep),
    ],
    [join(stepsDir, `find${n.pascal}.ts`), T.stepFind(n, paths.typesFromStep)],
    [
      join(stepsDir, `findMany${n.pascal}.ts`),
      T.stepFindMany(n, paths.typesFromStep),
    ],
    [
      join(workflowsDir, `create${n.pascal}.ts`),
      T.workflowCreate(n, paths.typesFromWorkflow, paths.stepsFromWorkflow),
    ],
    [
      join(workflowsDir, `update${n.pascal}.ts`),
      T.workflowUpdate(n, paths.typesFromWorkflow, paths.stepsFromWorkflow),
    ],
    [
      join(workflowsDir, `delete${n.pascal}.ts`),
      T.workflowDelete(n, paths.typesFromWorkflow, paths.stepsFromWorkflow),
    ],
    [
      join(workflowsDir, `find${n.pascal}.ts`),
      T.workflowFind(n, paths.typesFromWorkflow, paths.stepsFromWorkflow),
    ],
    [
      join(workflowsDir, `findMany${n.pascal}.ts`),
      T.workflowFindMany(n, paths.typesFromWorkflow, paths.stepsFromWorkflow),
    ],
    [
      join(routeDir, "api.ts"),
      T.routeCollectionApi(n, paths.workflowFromRoute, paths.typesFromRoute),
    ],
    [
      join(routeDir, "validator.ts"),
      T.routeCollectionValidator(n, paths.typesFromRoute),
    ],
    [
      join(routeDir, "query.ts"),
      T.routeCollectionQuery(n, paths.typesFromRoute),
    ],
    [join(routeDir, "middleware.ts"), T.routeMiddleware()],
    [join(routeDir, "route.ts"), T.routeCollectionRoute()],
    [
      join(routeIdDir, "api.ts"),
      T.routeIdApi(n, paths.workflowFromRouteId, paths.typesFromRouteId),
    ],
    [
      join(routeIdDir, "validator.ts"),
      T.routeIdValidator(n, paths.typesFromRouteId),
    ],
    [join(routeIdDir, "middleware.ts"), T.routeMiddleware()],
    [join(routeIdDir, "route.ts"), T.routeIdRoute()],
  ];
  const write = writeOnce(result);
  for (const [path, content] of files) write(path, content);
}
