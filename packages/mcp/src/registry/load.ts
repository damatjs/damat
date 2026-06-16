import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { formatModuleRef } from "./ref";
import type { ModuleRef, RegistryIndex, RegistryModuleEntry } from "./types";

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

/** Load and validate the registry index from a URL, file, or directory. */
export async function loadRegistryIndex(location: string): Promise<RegistryIndex> {
  let raw: unknown;
  if (isUrl(location)) {
    const res = await fetch(location);
    if (!res.ok) {
      throw new Error(`Registry fetch failed (${res.status}): ${location}`);
    }
    raw = await res.json();
  } else {
    const file = registryIndexFile(location);
    if (!existsSync(file)) throw new Error(`Registry index not found: ${file}`);
    raw = JSON.parse(readFileSync(file, "utf-8"));
  }
  if (raw === null || typeof raw !== "object" || typeof (raw as RegistryIndex).modules !== "object") {
    throw new Error('Registry index must be JSON with a "modules" object');
  }
  return raw as RegistryIndex;
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
