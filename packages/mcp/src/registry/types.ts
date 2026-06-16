/**
 * Registry shapes — inline copies of @damatjs/module's registry/entry.ts, kept
 * here so this server stays dependency-free and runs without a build. Keep in
 * sync with packages/module/src/registry/entry.ts.
 */

export interface ModuleRef {
  namespace?: string;
  name: string;
  version?: string;
}

export interface RegistryVerification {
  status: "unverified" | "pending" | "verified" | "rejected" | "revoked";
  reason?: string;
  integrity?: string;
}

export interface RegistryModuleEntry {
  name?: string;
  source: string;
  description?: string;
  owner?: { namespace: string; verified?: boolean };
  verification?: RegistryVerification;
  versions?: Record<string, { source: string } | string>;
  latest?: string;
  keywords?: string[];
  license?: string;
  homepage?: string;
  repository?: string;
}

export interface RegistryIndex {
  modules: Record<string, RegistryModuleEntry>;
}
