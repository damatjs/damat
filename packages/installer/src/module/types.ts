export type ModuleArtifactLocation =
  string | { type: "package"; name: string } | { type: "damat"; path: string };

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

export interface ModuleManifest {
  name: string;
  version?: string;
  description?: string;
  author?: unknown;
  env?: unknown[];
  packages?: Record<string, string>;
  modules?: string[];
  pairsWith?: string[];
  paths?: ModuleManifestPaths;
  registry?: Record<string, unknown>;
}

export interface LocatedModuleManifest {
  manifest: ModuleManifest;
  manifestDir: string;
  path: string;
}

export interface ResolvedModule {
  root: string;
  manifest: ModuleManifest;
  entry: string;
  models?: string;
  migrations?: string;
  routes?: string;
  workflows?: string;
  jobs?: string;
  events?: string;
  pipelines?: string;
  location: ModuleArtifactLocation;
  mutable: boolean;
  packageName?: string;
}
