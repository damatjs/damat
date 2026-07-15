import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listOwnerDirs, renderAggregator } from "../linkTemplates";
import { moduleLayoutPaths } from "./layout";
import type { RemovedModuleLayout } from "./types";

export function removeModuleSplit(
  cwd: string,
  moduleId: string,
  modulesDir: string,
): RemovedModuleLayout {
  const layout = moduleLayoutPaths(cwd, moduleId, modulesDir);
  const targets = [
    layout.moduleHome,
    layout.apiTarget,
    layout.workflowsTarget,
    layout.linksTarget,
    layout.testsTarget,
  ];
  const removed: string[] = [];
  const hadLinks = existsSync(layout.linksTarget);
  for (const target of targets) {
    if (!existsSync(target)) continue;
    rmSync(target, { recursive: true, force: true });
    removed.push(target);
  }
  const linksRegenerated = hadLinks && existsSync(layout.linksRoot);
  if (linksRegenerated) {
    writeFileSync(
      join(layout.linksRoot, "index.ts"),
      renderAggregator(listOwnerDirs(layout.linksRoot)),
    );
  }
  return { removed, linksRegenerated };
}
