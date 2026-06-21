
export interface CrudScaffoldOptions {
  /** Module id — the `getModule(...)` key generated steps use. */
  moduleId: string;
  /** Dir under which `<resource>/` route folders are created. */
  routesRoot: string;
  /** Dir under which `<resource>/{steps,workflows}` folders are created. */
  workflowsRoot: string;
  /** Absolute path to the generated `types/` dir (drives relative imports). */
  typesDir: string;
}

export interface CrudScaffoldResult {
  created: string[];
  skipped: string[];
}
