export interface OrmModule {
  id: string;
  name: string;
  path: string;
  resolve: string;
  entry?: string;
  models?: string;
  migrations?: string;
  mutable?: boolean;
  packageName?: string;
  /** "link" for a cross-module link directory; undefined for ordinary modules. */
  kind?: "module" | "link";
}

export interface OrmModuleContainer {
  [x: string]: OrmModule;
}
