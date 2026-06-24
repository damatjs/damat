import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, sep } from "node:path";

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
 *   - `tests/…`            → `tests/<moduleId>/…`                 (grouped by module)
 *   - everything else      → `src/modules/<id>`                   (models, service, …)
 *
 * The module ships these trees FLAT (`api/routes/<table>`, `workflows/<table>`,
 * `tests/`); the `<moduleId>/` segment is added HERE, on install — never by the
 * module's own codegen. The framework only scans the app's `src/api/routes` for
 * routes, so a module's routes are dead until relocated here — that is the whole
 * point of the split. `tests/` is a package-root sibling of `src/`, so it is read
 * from `packageDir` (not `sourceModuleDir`).
 */
export function installModuleSplit(
  sourceModuleDir: string,
  options: InstallModuleSplitOptions,
): InstalledModuleLayout {
  const { cwd, moduleId, modulesDir, force } = options;
  const packageDir = options.packageDir ?? sourceModuleDir;

  const apiSrc = join(sourceModuleDir, "api", "routes");
  const workflowsSrc = join(sourceModuleDir, "workflows");
  const testsSrc = join(packageDir, "tests");
  const apiDir = join(sourceModuleDir, "api");
  const workflowsDir = join(sourceModuleDir, "workflows");
  // Only relevant to the legacy layout, where `tests/` sits inside the copied
  // module dir; in the package layout it lives outside `sourceModuleDir`.
  const testsDir = join(sourceModuleDir, "tests");

  const moduleHome = join(cwd, modulesDir, moduleId);
  const apiTarget = join(cwd, "src", "api", "routes", moduleId);
  const workflowsTarget = join(cwd, "src", "workflows", moduleId);
  const testsTarget = join(cwd, "tests", moduleId);

  const hasApi = existsSync(apiSrc);
  const hasWorkflows = existsSync(workflowsSrc);
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
      if (src === testsDir || src.startsWith(testsDir + sep)) return false;
      return true;
    },
  });

  // 2. Routes → app's mounted src/api/routes/<moduleId>/<table> (grouped by module).
  if (hasApi) mergeChildren(apiSrc, apiTarget);

  // 3. Workflows → app's src/workflows/<moduleId>/<table> (grouped by module).
  if (hasWorkflows) mergeChildren(workflowsSrc, workflowsTarget);

  // 4. Tests → app's tests/<moduleId>/… (grouped by module).
  if (hasTests) mergeChildren(testsSrc, testsTarget);

  return {
    moduleHome,
    apiTarget: hasApi ? apiTarget : null,
    workflowsTarget: hasWorkflows ? workflowsTarget : null,
    testsTarget: hasTests ? testsTarget : null,
  };
}
