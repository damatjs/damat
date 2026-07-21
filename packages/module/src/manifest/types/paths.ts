export interface ModuleManifestPaths {
  entry?: string;
  models?: string;
  migrations?: string;
  routes?: string;
  workflows?: string;
  jobs?: string;
  events?: string;
  pipelines?: string;
  links?: string;
  tests?: string;
  types?: string;
}

export const DEFAULT_MODULE_PATHS: Required<ModuleManifestPaths> = {
  entry: "./index.ts",
  models: "./models",
  migrations: "./migrations",
  routes: "./api/routes",
  workflows: "./workflows",
  jobs: "./jobs",
  events: "./events",
  pipelines: "./pipelines",
  links: "./links",
  tests: "../tests",
  types: "./types",
};
