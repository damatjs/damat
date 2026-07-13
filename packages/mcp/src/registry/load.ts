import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { formatModuleRef } from "./ref";
import type { ModuleRef, RegistryIndex, RegistryModuleEntry, RegistryVerdict } from "./types";

function isUrl(s: string): boolean {
  return /^https?:\/\//.test(s);
}

/** Resolve a registry location to its index file (a directory → dir/registry.json). */
function registryIndexFile(location: string): string {
  if (existsSync(location) && statSync(location).isDirectory()) {
    return join(location, "registry.json");
  }
  return location;
}

/** How long a fetched index is served from memory before re-fetching. */
const CACHE_TTL_MS = 60_000;
/** Abort a registry fetch that hangs longer than this. */
const FETCH_TIMEOUT_MS = 10_000;

const cache = new Map<string, { index: RegistryIndex; fetchedAt: number }>();

/** Drop all cached indexes (tests, or after a registry change). */
export function clearRegistryCache(): void {
  cache.clear();
}

/**
 * Load and validate the registry index from a URL, file, or directory.
 * URL indexes are cached in-process for a short TTL so the list/search/info
 * tools don't re-fetch on every call.
 */
export async function loadRegistryIndex(location: string): Promise<RegistryIndex> {
  const cached = cache.get(location);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.index;
  }

  let raw: unknown;
  if (isUrl(location)) {
    raw = await fetchRegistryJson(location);
  } else {
    const file = registryIndexFile(location);
    if (!existsSync(file)) throw new Error(`Registry index not found: ${file}`);
    raw = JSON.parse(readFileSync(file, "utf-8"));
  }
  if (raw === null || typeof raw !== "object" || typeof (raw as RegistryIndex).modules !== "object") {
    throw new Error('Registry index must be JSON with a "modules" object');
  }

  const index = sanitizeIndex(raw as RegistryIndex);
  cache.set(location, { index, fetchedAt: Date.now() });
  return index;
}

/** Fetch the index over HTTP with a timeout and status-specific error messages. */
async function fetchRegistryJson(location: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(location, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (e) {
    const cause = e instanceof Error ? e : new Error(String(e));
    if (cause.name === "TimeoutError" || cause.name === "AbortError") {
      throw new Error(
        `Registry fetch timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${location}`,
      );
    }
    throw new Error(`Could not reach registry at ${location}: ${cause.message}`);
  }
  if (res.status === 404) {
    throw new Error(
      `Registry not found (404) at ${location} — check DAMAT_MODULE_REGISTRY`,
    );
  }
  if (res.status >= 500) {
    throw new Error(`Registry server error (${res.status}): ${location}`);
  }
  if (!res.ok) {
    throw new Error(`Registry fetch failed (${res.status}): ${location}`);
  }
  try {
    return await res.json();
  } catch {
    throw new Error(`Registry at ${location} did not return valid JSON`);
  }
}

/**
 * Drop malformed entries instead of failing the whole index or passing
 * garbage to the tools. Every kept entry is guaranteed to have a string
 * `source`; invalid keys are reported once on stderr (stdout carries the
 * MCP protocol).
 */
function sanitizeIndex(index: RegistryIndex): RegistryIndex {
  const modules: Record<string, RegistryModuleEntry> = {};
  const invalid: string[] = [];
  for (const [key, entry] of Object.entries(index.modules)) {
    if (
      entry === null ||
      typeof entry !== "object" ||
      typeof (entry as RegistryModuleEntry).source !== "string"
    ) {
      invalid.push(key);
      continue;
    }
    modules[key] = entry;
  }
  if (invalid.length > 0) {
    console.error(
      `damat-mcp: skipped ${invalid.length} malformed registry entr${invalid.length === 1 ? "y" : "ies"}: ${invalid.join(", ")}`,
    );
  }
  return { modules };
}

/** Find an entry by ref, trying "namespace/name" first, then the bare "name". */
export function lookupEntry(
  index: RegistryIndex,
  ref: ModuleRef,
): { key: string; entry: RegistryModuleEntry } | null {
  const keys = [
    formatModuleRef({ ...(ref.namespace ? { namespace: ref.namespace } : {}), name: ref.name }),
    ref.name,
  ];
  for (const key of keys) {
    const entry = index.modules[key];
    if (entry) return { key, entry };
  }
  return null;
}

/**
 * Derive the gateway base URL from a registry location, if it is a hosted URL.
 * For example: "https://registry.damatjs.com/api/damat/modules" →
 *   strips a trailing "/api/damat/modules*" path to expose the gateway root,
 *   then the verdict route lives at "<base>/api/registry/packages/:name/:version/verdict".
 *
 * Heuristic: walk back the URL path until we hit the gateway verdict endpoint.
 * We strip known registry-index suffixes; what remains is the API base.
 */
function gatewayBaseFromRegistryUrl(location: string): string | null {
  if (!isUrl(location)) return null;
  const u = new URL(location);
  // Remove known suffixes so the caller can append /registry/packages/:name/:ver/verdict
  let base = location
    .replace(/\/api\/damat\/modules\/?.*$/, "")
    .replace(/\/registry\.json\/?$/, "")
    .replace(/\/api\/registry\/modules\/?.*$/, "");
  // If it reduced to just the origin (nothing stripped), treat the whole URL
  // minus path as the base — the caller will build the verdict URL off it.
  if (base === location) {
    base = `${u.protocol}//${u.host}`;
  }
  // Normalise trailing slash
  return base.replace(/\/+$/, "");
}

/**
 * Fetch the live security verdict for a specific module version from the
 * registry gateway.  Returns `null` (never throws) when:
 *   - the registry is not a hosted URL
 *   - the network is unreachable
 *   - the gateway does not have a verdict for this name/version
 *
 * Callers should treat `null` as "verdict unavailable" and omit the field.
 */
export async function fetchVerdict(
  registryLocation: string,
  name: string,
  version: string,
): Promise<RegistryVerdict | null> {
  const base = gatewayBaseFromRegistryUrl(registryLocation);
  if (!base) return null;

  const url = `${base}/api/registry/packages/${encodeURIComponent(name)}/${encodeURIComponent(version)}/verdict`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    const json = (await res.json()) as RegistryVerdict;
    if (!json || typeof json.status !== "string") return null;
    return json;
  } catch {
    return null;
  }
}
