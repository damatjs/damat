export interface ResolvedModuleSource {
  /** Local directory containing the module files */
  dir: string;
  /** Cleanup function for temporary checkouts (no-op for local paths) */
  cleanup: () => void;
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
