/**
 * Registry index entry — the record the module registry serves for each
 * published module.
 *
 * A registry (the public one damat will host, or a company-internal one for
 * trusted shared libraries) is an index that maps a module ref to a fetchable
 * source plus the metadata that makes an install trustworthy: who authored it,
 * the verifiable owner that published it, and the verification the registry
 * backend stamped on it.
 *
 * Two planes, by who controls them:
 * - The module author declares `name/version/author/license/keywords/repository`
 *   in their `module.json` (see ModuleManifest). The registry mirrors those for
 *   search and display.
 * - The registry backend assigns `owner` and stamps `verification` — an author
 *   cannot self-verify. These are the trust anchor (see ./verify).
 *
 * The shape is forward-compatible with the simplest possible index: a bare
 * `{ source }` (or even a string version source) is still a valid entry, so
 * existing registries keep working as the richer fields are added.
 */

/** Trust state a module can be in, as stamped by the registry backend. */
export type VerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected"
  | "revoked";

export const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  "unverified",
  "pending",
  "verified",
  "rejected",
  "revoked",
];

/** Author identity, mirrored from the module manifest. */
export interface RegistryAuthor {
  name: string;
  email?: string;
  url?: string;
}

/**
 * The verifiable owner of a module — the registry account that published it.
 * This is the trust anchor: the backend ties a module to an owner it has
 * identified, so installers know who stands behind the code.
 */
export interface RegistryOwner {
  /** Registry namespace the module publishes under, e.g. "damatjs" */
  namespace: string;
  /** Stable account/org id the registry backend issued for the owner */
  id?: string;
  /** Public profile / organisation URL */
  url?: string;
  /** Whether the registry has verified this owner's identity */
  verified?: boolean;
}

/**
 * Verification a module carries, stamped by the registry backend. Absent on an
 * entry means it has never been checked (treated as "unverified").
 */
export interface RegistryVerification {
  /** Trust state set by the registry backend */
  status: VerificationStatus;
  /** Authority that performed the check, e.g. "registry.damatjs.com" */
  verifiedBy?: string;
  /** ISO-8601 timestamp of the check */
  verifiedAt?: string;
  /** Integrity digest of the published source, e.g. "sha256-…" */
  integrity?: string;
  /** Why a module is rejected/revoked — surfaced to installers */
  reason?: string;
}

/** A pinned source for one version/tag, optionally with its own verification. */
export interface RegistryVersionEntry {
  /** Fetchable source for this exact version (git url, github shorthand, path) */
  source: string;
  /** Integrity digest pinned to this version */
  integrity?: string;
  /** Per-version verification, overriding the module-level status */
  verification?: RegistryVerification;
}

/**
 * One module in a registry index. Keyed by its ref (namespace/name) in
 * RegistryIndex.modules.
 */
export interface RegistryModuleEntry {
  /** Canonical registry id (namespace/name). The index key is authoritative; this is informational. */
  name?: string;
  /** Default fetchable source: a git URL, github shorthand, or local path */
  source: string;
  description?: string;
  /** Author identity, mirrored from the module manifest for search/display */
  author?: RegistryAuthor;
  /** The verifiable owner that published the module — the registry's trust anchor */
  owner?: RegistryOwner;
  /** Trust status stamped by the registry backend (absent ⇒ unverified) */
  verification?: RegistryVerification;
  /** Pinned sources per version/tag; a bare string is shorthand for `{ source }` */
  versions?: Record<string, RegistryVersionEntry | string>;
  /** Convenience dist-tag → version, e.g. "0.2.0" */
  latest?: string;
  /** Mirrored manifest metadata the catalog indexes */
  keywords?: string[];
  license?: string;
  homepage?: string;
  repository?: string;
}

/** A registry index — what a hosted (or local) registry serves. */
export interface RegistryIndex {
  modules: Record<string, RegistryModuleEntry>;
}

/**
 * Back-compat alias. Early registries used the name RegistryIndexEntry for the
 * `{ source, description, versions }` shape; it is a subset of the entry above.
 */
export type RegistryIndexEntry = RegistryModuleEntry;

/** Normalize a version source, which may be a bare string or a full entry. */
export function normalizeVersionEntry(
  value: RegistryVersionEntry | string,
): RegistryVersionEntry {
  return typeof value === "string" ? { source: value } : value;
}
