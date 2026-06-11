import type { ModuleManifest } from "../manifest/types";

/**
 * A registry module reference — how modules will be addressed once the
 * hosted registry exists:
 *
 *   user                  → name only (default namespace, latest version)
 *   user@0.2.0            → pinned version
 *   damatjs/user          → namespaced
 *   damatjs/user@latest   → namespaced + tag
 */
export interface ModuleRef {
  /** Registry namespace (publisher/org). Undefined = default namespace */
  namespace?: string;
  /** Module name (kebab-case) */
  name: string;
  /** Semver version or dist-tag. Undefined = latest */
  version?: string;
}

export interface ModuleValidationReport {
  /** True when the module has no errors (warnings allowed) */
  valid: boolean;
  /** Problems that block installing or publishing the module */
  errors: string[];
  /** Gaps to fix before publishing to the registry */
  warnings: string[];
  /** The parsed manifest, when readable */
  manifest: ModuleManifest | null;
}
