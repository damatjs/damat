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
 *   in their `damat.json` module metadata. The registry mirrors those for
 *   search and display.
 * - The registry backend assigns `owner` and stamps `verification` — an author
 *   cannot self-verify. These are the trust anchor (see ./verify).
 *
 * The shape is forward-compatible with the simplest possible index: a bare
 * `{ source }` (or even a string version source) is still a valid entry, so
 * existing registries keep working as the richer fields are added.
 */

import type {
  RegistryAuthor,
  RegistryOwner,
  RegistryVerification,
  RegistryVersionEntry,
} from "./trust";

export * from "./trust";

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
