import { isAbsolute, join, dirname, resolve as resolvePath } from "node:path";
import { existsSync, readFileSync, statSync } from "node:fs";
import type { ModuleRef } from "./types";
import { formatModuleRef } from "./format";

/**
 * Registry index format — what a hosted (or local) module registry serves.
 * The registry is just an index mapping refs to fetchable sources.
 */
export interface RegistryIndexEntry {
  /** Default source: a git URL, github shorthand, or local path */
  source: string;
  description?: string;
  /** Optional pinned sources per version/tag */
  versions?: Record<string, string>;
}

export interface RegistryIndex {
  modules: Record<string, RegistryIndexEntry>;
}

/**
 * Resolve a module ref against the configured registry.
 *
 * The registry location comes from DAMAT_MODULE_REGISTRY and can be:
 * - an http(s) URL serving the index JSON
 * - a local path to the index JSON (or a directory containing registry.json)
 *
 * Returns the entry's source (path/git) or null when no registry is
 * configured or the ref isn't indexed.
 */
export async function resolveRegistryRef(
  ref: ModuleRef,
  registryLocation: string | undefined = process.env.DAMAT_MODULE_REGISTRY,
): Promise<string | null> {
  if (!registryLocation) return null;

  const index = await loadRegistryIndex(registryLocation);

  const keys = [
    formatModuleRef({ ...(ref.namespace ? { namespace: ref.namespace } : {}), name: ref.name }),
    ref.name,
  ];
  let entry: RegistryIndexEntry | undefined;
  for (const key of keys) {
    entry = index.modules[key];
    if (entry) break;
  }
  if (!entry) return null;

  const source = ref.version
    ? entry.versions?.[ref.version]
    : entry.source;
  if (!source) {
    throw new Error(
      `Registry has "${formatModuleRef(ref)}" but no source for version "${ref.version}"`,
    );
  }

  // Relative local sources resolve against the index file's directory
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
