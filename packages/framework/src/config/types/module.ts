export interface ModuleConfigObject {
  [x: string]: ModuleConfig;
}

export type { ModuleArtifactLocation as ModuleResolveLocation } from "@damatjs/installer";
import type { ModuleArtifactLocation } from "@damatjs/installer";

export interface ModuleConfig {
  id?: string;
  resolve: ModuleArtifactLocation;
  options?: Record<string, unknown>;
  /** Provenance recorded when the module was installed via `damat module add`. */
  source?: ModuleSource;
}

/**
 * Where an installed module came from, written into `damat.config.ts` so every
 * module is traceable to its origin. Produced by `damat module add` and read
 * back for verification/update flows.
 */
export interface ModuleSource {
  /** How the module was resolved. */
  type: "path" | "git" | "registry";
  /** The exact source argument the user passed (path, git url, or registry ref). */
  ref: string;
  /** Concrete location the files were copied from (resolved path or repo url). */
  url: string;
  /** Registry-recorded version, when installed from the registry. */
  version?: string | undefined;
  /** Owning namespace, when installed from the registry. */
  owner?: string | undefined;
  /** Registry verification status at install time. */
  verification?: string | undefined;
  /** Content integrity hash recorded by the registry. */
  integrity?: string | undefined;
  /** ISO timestamp stamped when the entry is written to the config. */
  installedAt: string;
}
