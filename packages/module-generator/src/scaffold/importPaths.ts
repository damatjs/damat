import { relative } from "node:path";
import type { ScaffoldAliases } from "./type";

export interface ScaffoldImports {
  typesFromStep: string;
  typesFromWorkflow: string;
  stepsFromWorkflow: string;
  workflowFromRoute: string;
  typesFromRoute: string;
  workflowFromRouteId: string;
  typesFromRouteId: string;
}

interface ImportPathOptions {
  aliases?: ScaffoldAliases;
  typesIndex: string;
  stepsDir: string;
  workflowsDir: string;
  routeDir: string;
  routeIdDir: string;
}

function spec(fromDir: string, toNoExt: string): string {
  let path = relative(fromDir, toNoExt).replace(/\\/g, "/");
  if (!path.startsWith(".")) path = `./${path}`;
  return path;
}

export function scaffoldImports(options: ImportPathOptions): ScaffoldImports {
  const { aliases, typesIndex, stepsDir, workflowsDir, routeDir, routeIdDir } =
    options;
  const typesAlias = aliases ? `${aliases.module}/types` : null;
  const workflowAlias = aliases?.workflows ?? null;
  return {
    typesFromStep: typesAlias ?? spec(stepsDir, typesIndex),
    typesFromWorkflow: typesAlias ?? spec(workflowsDir, typesIndex),
    stepsFromWorkflow: workflowAlias ?? spec(workflowsDir, stepsDir),
    workflowFromRoute: workflowAlias ?? spec(routeDir, workflowsDir),
    typesFromRoute: typesAlias ?? spec(routeDir, typesIndex),
    workflowFromRouteId: workflowAlias ?? spec(routeIdDir, workflowsDir),
    typesFromRouteId: typesAlias ?? spec(routeIdDir, typesIndex),
  };
}
