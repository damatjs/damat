import { existsSync } from "node:fs";
import { relative } from "node:path";
import type { ModuleManifest } from "@damatjs/module";
import type { moduleLayoutPaths } from "../helpers";

type Layout = ReturnType<typeof moduleLayoutPaths>;

export function existingTargets(layout: Layout): string[] {
  return [
    layout.moduleHome,
    layout.apiTarget,
    layout.workflowsTarget,
    layout.linksTarget,
    layout.testsTarget,
  ].filter(existsSync);
}

export function removalPlan(
  cwd: string,
  moduleId: string,
  targets: string[],
  entry: unknown,
  cleanEnv: boolean,
  manifest: ModuleManifest | null,
): string[] {
  return [
    ...targets.map((target) => `delete ${relative(cwd, target)}/`),
    ...(entry ? [`deregister "${moduleId}" from damat.config.ts`] : []),
    `remove "@${moduleId}/*" alias from tsconfig.json (if present)`,
    ...(cleanEnv && manifest
      ? [
          `remove the "# --- module: ${manifest.name} ---" block from .env.example`,
        ]
      : []),
  ];
}
