import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fetchRegistryJson } from "./fetch";
import type { RegistryIndex, RegistryModuleEntry } from "./types";

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { index: RegistryIndex; fetchedAt: number }>();

function isUrl(value: string): boolean {
  return /^https?:\/\//.test(value);
}

function registryIndexFile(location: string): string {
  if (existsSync(location) && statSync(location).isDirectory()) {
    return join(location, "registry.json");
  }
  return location;
}

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

export function clearRegistryCache(): void {
  cache.clear();
}

export async function loadRegistryIndex(
  location: string,
): Promise<RegistryIndex> {
  const cached = cache.get(location);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.index;
  }
  let raw: unknown;
  if (isUrl(location)) raw = await fetchRegistryJson(location);
  else {
    const file = registryIndexFile(location);
    if (!existsSync(file)) throw new Error(`Registry index not found: ${file}`);
    raw = JSON.parse(readFileSync(file, "utf-8"));
  }
  if (
    raw === null ||
    typeof raw !== "object" ||
    typeof (raw as RegistryIndex).modules !== "object"
  ) {
    throw new Error('Registry index must be JSON with a "modules" object');
  }
  const index = sanitizeIndex(raw as RegistryIndex);
  cache.set(location, { index, fetchedAt: Date.now() });
  return index;
}
