/**
 * Portable import aliases for scaffolded files. When provided, generated
 * step/workflow/route files import via tsconfig path aliases instead of deep
 * relative chains, so the SAME import resolves both standalone and after the
 * module is installed into a host backend (where its parts are relocated).
 *
 * - `module` (e.g. `@referral`) anchors the parts that STAY inside the module
 *   (`types/`, `service`) — resolves to `./src/*` standalone and
 *   `./src/modules/<id>/*` in the app.
 * - `workflows` (e.g. `@workflows`) anchors the MOVE-OUT workflow tree, mapped
 *   to the same `./src/workflows` dir in both the module and the app (via a
 *   non-wildcard `@workflows` entry + the `@workflows/*` form). The module ships
 *   its workflows FLAT (`workflows/<table>`); the `<id>/` segment is added by
 *   `damat module add`. So:
 *     - workflow → step is a relative sibling (`../steps/<op>`) within the same
 *       `<table>` subtree (which relocates together), needing no alias;
 *     - route → workflow imports from the bare barrel root `@workflows`
 *       (→ `src/workflows/index`), which resolves identically before/after install.
 */
export interface ScaffoldAliases {
  /** Module-name alias root, e.g. `@referral` (no trailing slash). */
  module: string;
  /** Shared workflows alias root, e.g. `@workflows` (no trailing slash). */
  workflows: string;
}

export interface CrudScaffoldOptions {
  /** Module id — the `getModule(...)` key generated steps use. */
  moduleId: string;
  /** Dir under which `<resource>/` route folders are created. */
  routesRoot: string;
  /** Dir under which `<resource>/{steps,workflows}` folders are created. */
  workflowsRoot: string;
  /** Absolute path to the generated `types/` dir (drives relative imports). */
  typesDir: string;
  /**
   * Portable import aliases. When set, scaffolded files import via aliases
   * instead of relative paths. When omitted, the legacy relative specifiers are
   * emitted (computed from the dirs above).
   */
  aliases?: ScaffoldAliases;
}

export interface CrudScaffoldResult {
  created: string[];
  skipped: string[];
}
