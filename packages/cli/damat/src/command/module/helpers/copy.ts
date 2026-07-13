import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, sep } from "node:path";
import {
  listModelBasenames,
  listOwnerDirs,
  renderAggregator,
  renderOwnerIndex,
} from "./linkTemplates";

const notVcsOrDeps = (src: string): boolean =>
  !src.includes("/.git/") &&
  !src.endsWith("/.git") &&
  !src.includes("/node_modules/") &&
  !src.endsWith("/node_modules");

/** Copy a module directory into the app, excluding VCS/dependency dirs */
export function copyModule(sourceDir: string, targetDir: string): void {
  cpSync(sourceDir, targetDir, { recursive: true, filter: notVcsOrDeps });
}

export interface InstalledModuleLayout {
  /** Where the module's model/service/types/migrations/config landed. */
  moduleHome: string;
  /** Where the module's routes landed (null if the module ships none). */
  apiTarget: string | null;
  /** Where the module's workflows landed (null if the module ships none). */
  workflowsTarget: string | null;
  /** Where the module's tests landed (null if the module ships none). */
  testsTarget: string | null;
  /** Where the module's link files landed (null if the module ships none). */
  linksTarget: string | null;
}

/** The app-side directories one installed module occupies (see installModuleSplit). */
export interface ModuleLayoutPaths {
  moduleHome: string;
  apiTarget: string;
  workflowsTarget: string;
  linksRoot: string;
  linksTarget: string;
  testsTarget: string;
}

/**
 * The single source of truth for WHERE a module's split pieces live in the
 * app. Install and remove both derive their targets from here so the two can
 * never drift.
 */
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

export interface InstallModuleSplitOptions {
  cwd: string;
  moduleId: string;
  /** Modules directory (default `src/modules`). */
  modulesDir: string;
  /**
   * The module PACKAGE root — where `tests/` lives (a sibling of `src/`, so it
   * is outside `sourceModuleDir` in the package layout). Defaults to
   * `sourceModuleDir` for the legacy in-app layout.
   */
  packageDir?: string;
  /** Overwrite existing targets first. */
  force?: boolean;
}

/** Merge each child of `src` into `dest/<child>` (keeps existing siblings). */
function mergeChildren(src: string, dest: string): void {
  for (const entry of readdirSync(src)) {
    cpSync(join(src, entry), join(dest, entry), {
      recursive: true,
      filter: notVcsOrDeps,
    });
  }
}

/**
 * Insert a module by SPLITTING it across the app's layers instead of dumping
 * the whole thing under `src/modules/<id>`. The resource leaf is always the
 * table name (the source of truth); both routes and workflows are grouped by
 * module id so installs never collide and route URLs are namespaced:
 *
 *   - `api/routes/<table>` → `src/api/routes/<moduleId>/<table>`  (grouped by module)
 *   - `workflows/<table>`  → `src/workflows/<moduleId>/<table>`   (grouped by module)
 *   - `links/models/<x>`   → `src/links/<moduleId>/models/<x>`    (grouped by module)
 *   - `tests/…`            → `tests/<moduleId>/…`                 (grouped by module)
 *   - everything else      → `src/modules/<id>`                   (models, service, …)
 *
 * The module ships these trees FLAT (`api/routes/<table>`, `workflows/<table>`,
 * `links/models/<x>.ts`, `tests/`); the `<moduleId>/` segment is added HERE, on
 * install — never by the module's own codegen. The framework only scans the app's
 * `src/api/routes` for routes, so a module's routes are dead until relocated here —
 * that is the whole point of the split. `tests/` is a package-root sibling of
 * `src/`, so it is read from `packageDir` (not `sourceModuleDir`).
 *
 * Links are shipped as real `defineLink(...)` files. They are copied SKIP-EXISTING
 * (overwritten only on `--force`) so an owner can edit a copied link's target
 * without a re-install clobbering it. The module ships NO link migration — the
 * backend generates it with `damat-orm migrate:create link:<moduleId>`. A shipped
 * link is dormant until the backend migrates it and inert until queried, so it can
 * reference a module that is not (yet) installed without harm. After copying, the
 * owner `index.ts` and the top-level `src/links/index.ts` aggregator are
 * regenerated from the filesystem, keeping repeated installs idempotent and
 * preserving hand-authored or other modules' link owners.
 */
export function installModuleSplit(
  sourceModuleDir: string,
  options: InstallModuleSplitOptions,
): InstalledModuleLayout {
  const { cwd, moduleId, modulesDir, force } = options;
  const packageDir = options.packageDir ?? sourceModuleDir;

  const apiSrc = join(sourceModuleDir, "api", "routes");
  const workflowsSrc = join(sourceModuleDir, "workflows");
  const linksSrc = join(sourceModuleDir, "links");
  const testsSrc = join(packageDir, "tests");
  const apiDir = join(sourceModuleDir, "api");
  const workflowsDir = join(sourceModuleDir, "workflows");
  const linksDir = join(sourceModuleDir, "links");
  // Only relevant to the legacy layout, where `tests/` sits inside the copied
  // module dir; in the package layout it lives outside `sourceModuleDir`.
  const testsDir = join(sourceModuleDir, "tests");

  const { moduleHome, apiTarget, workflowsTarget, linksRoot, linksTarget, testsTarget } =
    moduleLayoutPaths(cwd, moduleId, modulesDir);

  const hasApi = existsSync(apiSrc);
  const hasWorkflows = existsSync(workflowsSrc);
  // A module ships link `defineLink(...)` files under `links/`. Accept them
  // wherever they sit — `links/<x>.ts`, `links/models/<x>.ts`, or an app-style
  // `links/<owner>/models/<x>.ts` — by collecting every `.ts` (bar `index.ts`
  // barrels) recursively, so a forgiving layout still gets split out instead of
  // dumped into the module home.
  const linkModels = collectLinkModelFiles(linksSrc);
  const hasLinks = linkModels.length > 0;
  const hasTests = existsSync(testsSrc);

  // Only the module home is a module-owned directory we can safely wipe on
  // --force; routes/workflows/tests are shared app dirs, so the per-resource
  // copy below just overwrites the module's own resource folders.
  if (force && existsSync(moduleHome)) {
    rmSync(moduleHome, { recursive: true, force: true });
  }

  // 1. Module home — everything EXCEPT the api/, workflows/ and tests/ subtrees.
  cpSync(sourceModuleDir, moduleHome, {
    recursive: true,
    filter: (src) => {
      if (!notVcsOrDeps(src)) return false;
      if (src === apiDir || src.startsWith(apiDir + sep)) return false;
      if (src === workflowsDir || src.startsWith(workflowsDir + sep)) return false;
      if (src === linksDir || src.startsWith(linksDir + sep)) return false;
      if (src === testsDir || src.startsWith(testsDir + sep)) return false;
      return true;
    },
  });

  // 2. Routes → app's mounted src/api/routes/<moduleId>/<table> (grouped by module).
  if (hasApi) mergeChildren(apiSrc, apiTarget);

  // 3. Workflows → app's src/workflows/<moduleId>/<table> (grouped by module).
  if (hasWorkflows) mergeChildren(workflowsSrc, workflowsTarget);

  // 4. Links → app's src/links/<moduleId>/ (grouped by module), then regenerate
  //    the owner index and the top-level aggregator from the filesystem.
  if (hasLinks) installModuleLinks(linkModels, linksTarget, linksRoot, Boolean(force));

  // 5. Tests → app's tests/<moduleId>/… (grouped by module).
  if (hasTests) mergeChildren(testsSrc, testsTarget);

  return {
    moduleHome,
    apiTarget: hasApi ? apiTarget : null,
    workflowsTarget: hasWorkflows ? workflowsTarget : null,
    testsTarget: hasTests ? testsTarget : null,
    linksTarget: hasLinks ? linksTarget : null,
  };
}

/** What removeModuleSplit actually deleted (paths that existed). */
export interface RemovedModuleLayout {
  removed: string[];
  /** True when the links aggregator was regenerated after removal. */
  linksRegenerated: boolean;
}

/**
 * The inverse of installModuleSplit: delete every app-side directory the
 * module occupies (module home, grouped routes/workflows/links/tests) and
 * regenerate the top-level `src/links/index.ts` aggregator from the remaining
 * owners so it never references the deleted one.
 */
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

  let linksRegenerated = false;
  if (hadLinks && existsSync(layout.linksRoot)) {
    writeFileSync(
      join(layout.linksRoot, "index.ts"),
      renderAggregator(listOwnerDirs(layout.linksRoot)),
    );
    linksRegenerated = true;
  }

  return { removed, linksRegenerated };
}

/** A shipped link model file: its flattened basename and absolute source path. */
interface LinkModelFile {
  base: string;
  path: string;
}

/**
 * Every link `defineLink(...)` model a module ships under `links/`, found
 * recursively so the layout is forgiving: `links/<x>.ts`, `links/models/<x>.ts`,
 * and an app-style `links/<owner>/models/<x>.ts` are all recognized. `index.ts`
 * barrels are skipped (we regenerate those). Results are flattened to basename
 * and sorted; on a basename clash the last one wins.
 */
function collectLinkModelFiles(linksSrc: string): LinkModelFile[] {
  if (!existsSync(linksSrc)) return [];
  const byBase = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (!notVcsOrDeps(p)) continue;
      if (statSync(p).isDirectory()) {
        walk(p);
        continue;
      }
      if (entry.endsWith(".ts") && entry !== "index.ts") {
        byBase.set(entry.slice(0, -3), p);
      }
    }
  };
  walk(linksSrc);
  return [...byBase.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([base, path]) => ({ base, path }));
}

/**
 * Copy a module's shipped link models into `src/links/<moduleId>/models/`
 * (skip-existing unless `force`, to preserve owner edits to a copied link's
 * target), ensure the dormant `migrations/` dir, and regenerate the owner
 * `index.ts` plus the top-level `src/links/index.ts` aggregator from the
 * filesystem so repeated installs stay idempotent and additive.
 */
function installModuleLinks(
  models: LinkModelFile[],
  linksTarget: string,
  linksRoot: string,
  force: boolean,
): void {
  const modelsTarget = join(linksTarget, "models");
  mkdirSync(modelsTarget, { recursive: true });
  for (const { base, path } of models) {
    const dest = join(modelsTarget, `${base}.ts`);
    if (existsSync(dest) && !force) continue; // preserve an owner-edited target
    cpSync(path, dest);
  }
  // The backend generates the junction migration; ship only the (empty) dir.
  mkdirSync(join(linksTarget, "migrations"), { recursive: true });
  // Both barrels are derived: rebuild from what actually landed on disk.
  writeFileSync(
    join(linksTarget, "index.ts"),
    renderOwnerIndex(listModelBasenames(modelsTarget)),
  );
  writeFileSync(
    join(linksRoot, "index.ts"),
    renderAggregator(listOwnerDirs(linksRoot)),
  );
}
