import type { ModuleEnvVar } from "./env";
import type { ModuleManifestPaths } from "./paths";
import type { ModuleAuthor, ModuleRegistryMeta } from "./registry";

export interface ModuleManifest {
  name: string;
  version?: string;
  description?: string;
  author?: ModuleAuthor | string;
  env?: ModuleEnvVar[];
  packages?: Record<string, string>;
  modules?: string[];
  pairsWith?: string[];
  paths?: ModuleManifestPaths;
  registry?: ModuleRegistryMeta;
}
