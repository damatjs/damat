import { join } from "node:path";
import type { ModuleLayoutPaths } from "./types";

export function moduleLayoutPaths(
  cwd: string,
  moduleId: string,
  modulesDir: string,
): ModuleLayoutPaths {
  const linksRoot = join(cwd, "src", "links");
  return {
    moduleHome: join(cwd, modulesDir, moduleId),
    apiTarget: join(cwd, "src", "api", "routes", moduleId),
    workflowsTarget: join(cwd, "src", "workflows", moduleId),
    linksRoot,
    linksTarget: join(linksRoot, moduleId),
    testsTarget: join(cwd, "tests", moduleId),
  };
}
