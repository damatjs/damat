import { isAbsolute, join, dirname, resolve as resolvePath } from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";
import type { ModuleRef } from "./types";
import { formatModuleRef } from "./format";
import {
  normalizeVersionEntry,
  type RegistryIndex,
  type RegistryModuleEntry,
  type RegistryOwner,
  type RegistryVerification,
} from "./entry";

/**
 * A resolved registry module — the fetchable source plus the trust metadata
 * the registry recorded for it. `damat module add` uses this both to fetch the
 * module and to write its provenance (owner, verification) into damat.config.ts.
 */
export interface ResolvedRegistryModule {
  /** Fetchable source for the requested ref (git url, github shorthand, path) */
  source: string;
  /** The version that resolved, when a specific version/tag was requested */
  version?: string | undefined;
  /** Verifiable owner recorded for the module, if any */
  owner?: RegistryOwner | undefined;
  /** Effective verification — version-level overrides module-level, never undefined */
  verification: RegistryVerification;
  /** Integrity digest pinned to the resolved source, if any */
  integrity?: string | undefined;
  /** The full registry entry, for callers that want author/keywords/etc */
  entry: RegistryModuleEntry;
}

/**
 * Resolve a module ref against the configured registry, returning the full
 * record (source + owner + verification).
 *
 * The registry location comes from DAMAT_MODULE_REGISTRY and can be:
 * - an http(s) URL serving the index JSON
 * - a local path to the index JSON (or a directory containing registry.json)
 *
 * Returns null when no registry is configured or the ref isn't indexed.
 */
export async function resolveRegistryEntry(
  ref: ModuleRef,
  registryLocation: string | undefined = process.env.DAMAT_MODULE_REGISTRY,
): Promise<ResolvedRegistryModule | null> {
  if (!registryLocation) return null;

  const index = await loadRegistryIndex(registryLocation);
  const entry = lookupEntry(index, ref);
  if (!entry) return null;

  const moduleVerification = entry.verification ?? { status: "unverified" as const };

  if (ref.version) {
    const versionValue = entry.versions?.[ref.version];
    if (!versionValue) {
      throw new Error(
        `Registry has "${formatModuleRef(ref)}" but no source for version "${ref.version}"`,
      );
    }
    const version = normalizeVersionEntry(versionValue);
    return {
      source: finalizeSource(version.source, registryLocation),
      version: ref.version,
      owner: entry.owner,
      verification: version.verification ?? moduleVerification,
      integrity: version.integrity ?? version.verification?.integrity,
      entry,
    };
  }

  return {
    source: finalizeSource(entry.source, registryLocation),
    version: entry.latest,
    owner: entry.owner,
    verification: moduleVerification,
    integrity: moduleVerification.integrity,
    entry,
  };
}

/**
 * Resolve a module ref to its fetchable source. Thin wrapper over
 * resolveRegistryEntry kept for callers that only need the source string.
 */
export async function resolveRegistryRef(
  ref: ModuleRef,
  registryLocation: string | undefined = process.env.DAMAT_MODULE_REGISTRY,
): Promise<string | null> {
  const resolved = await resolveRegistryEntry(ref, registryLocation);
  return resolved?.source ?? null;
}

function lookupEntry(
  index: RegistryIndex,
  ref: ModuleRef,
): RegistryModuleEntry | undefined {
  const keys = [
    formatModuleRef({
      ...(ref.namespace ? { namespace: ref.namespace } : {}),
      name: ref.name,
    }),
    ref.name,
  ];
  for (const key of keys) {
    const entry = index.modules[key];
    if (entry) return entry;
  }
  return undefined;
}

/** Relative local sources resolve against the index file's directory. */
function finalizeSource(source: string, registryLocation: string): string {
  if (
    !/^(https?:\/\/|git@)/.test(source) &&
    !isAbsolute(source) &&
    !isUrl(registryLocation)
  ) {
    const indexFile = registryIndexFile(registryLocation);
    return resolvePath(dirname(indexFile), source);
  }
  return source;
}

async function loadRegistryIndex(location: string): Promise<RegistryIndex> {
  if (isUrl(location)) {
    const response = await fetch(location);
    if (!response.ok) {
      throw new Error(`Registry fetch failed (${response.status}): ${location}`);
    }
    return validateIndex(await response.json());
  }

  const indexFile = registryIndexFile(location);
  if (!existsSync(indexFile)) {
    throw new Error(`Registry index not found: ${indexFile}`);
  }
  return validateIndex(JSON.parse(readFileSync(indexFile, "utf-8")));
}

function registryIndexFile(location: string): string {
  if (existsSync(location) && statSync(location).isDirectory()) {
    return join(location, "registry.json");
  }
  return location;
}

function isUrl(location: string): boolean {
  return /^https?:\/\//.test(location);
}

function validateIndex(raw: unknown): RegistryIndex {
  if (
    raw === null ||
    typeof raw !== "object" ||
    typeof (raw as RegistryIndex).modules !== "object"
  ) {
    throw new Error('Registry index must be JSON with a "modules" object');
  }
  return raw as RegistryIndex;
}
