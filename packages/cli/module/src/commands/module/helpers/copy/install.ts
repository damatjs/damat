import { cpSync, existsSync, rmSync } from "node:fs";
import { join, sep } from "node:path";
import { mergeChildren, notVcsOrDeps } from "./common";
import { moduleLayoutPaths } from "./layout";
import { collectLinkModelFiles, installModuleLinks } from "./links";
import type { InstalledModuleLayout, InstallModuleSplitOptions } from "./types";

export function installModuleSplit(
  source: string,
  options: InstallModuleSplitOptions,
): InstalledModuleLayout {
  const { cwd, moduleId, modulesDir, force } = options;
  const packageDir = options.packageDir ?? source;
  const apiSrc = join(source, "api", "routes");
  const workflowsSrc = join(source, "workflows");
  const linksSrc = join(source, "links");
  const testsSrc = join(packageDir, "tests");
  const excluded = [
    join(source, "api"),
    join(source, "workflows"),
    join(source, "links"),
    join(source, "tests"),
  ];
  const layout = moduleLayoutPaths(cwd, moduleId, modulesDir);
  const links = collectLinkModelFiles(linksSrc);
  const hasApi = existsSync(apiSrc);
  const hasWorkflows = existsSync(workflowsSrc);
  const hasTests = existsSync(testsSrc);
  if (force && existsSync(layout.moduleHome))
    rmSync(layout.moduleHome, { recursive: true, force: true });
  cpSync(source, layout.moduleHome, {
    recursive: true,
    filter: (path) =>
      notVcsOrDeps(path) &&
      !excluded.some((item) => path === item || path.startsWith(item + sep)),
  });
  if (hasApi) mergeChildren(apiSrc, layout.apiTarget);
  if (hasWorkflows) mergeChildren(workflowsSrc, layout.workflowsTarget);
  if (links.length)
    installModuleLinks(
      links,
      layout.linksTarget,
      layout.linksRoot,
      Boolean(force),
    );
  if (hasTests) mergeChildren(testsSrc, layout.testsTarget);
  return {
    moduleHome: layout.moduleHome,
    apiTarget: hasApi ? layout.apiTarget : null,
    workflowsTarget: hasWorkflows ? layout.workflowsTarget : null,
    testsTarget: hasTests ? layout.testsTarget : null,
    linksTarget: links.length ? layout.linksTarget : null,
  };
}
