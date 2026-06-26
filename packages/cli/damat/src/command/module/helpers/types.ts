import type { ModuleSource } from "@damatjs/framework";
import type { ResolvedRegistryModule } from "@damatjs/module";

export interface ResolvedModuleSource {
  /** Local directory containing the module files */
  dir: string;
  /** Cleanup function for temporary checkouts (no-op for local paths) */
  cleanup: () => void;
  /**
   * Provenance written into damat.config.ts. `installedAt` is stamped by the
   * install step right before the entry is written.
   */
  origin: Omit<ModuleSource, "installedAt">;
  /** Full registry record (owner + verification), present for registry installs */
  registry?: ResolvedRegistryModule;
}

export interface EnvSyncResult {
  /** Vars appended to .env.example */
  addedToExample: string[];
  /** Required vars not present in .env */
  missingInEnv: string[];
}

export interface PackageInstallResult {
  ok: boolean;
  output: string;
}

export interface LinkSyncResult {
  /** Rule keys ("<owner>:<name>") newly written to the draft file. */
  addedDrafts: string[];
  /** Rule keys still missing a target module/model — the owner must fill these. */
  needsTarget: string[];
}
