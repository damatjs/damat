import { formatModuleRef } from "./ref";
import type { ModuleRef, RegistryIndex, RegistryModuleEntry } from "./types";

export interface RegistryMatch {
  key: string;
  entry: RegistryModuleEntry;
}

export class AmbiguousModuleRefError extends Error {
  constructor(ref: ModuleRef, keys: string[]) {
    super(
      `Module ref "${formatModuleRef(ref)}" is ambiguous. Use one of: ${keys.join(", ")}`,
    );
    this.name = "AmbiguousModuleRefError";
  }
}

function finalName(value: string): string {
  return value.split("/").at(-1) ?? value;
}

function bareMatches(
  index: RegistryIndex,
  name: string,
): RegistryMatch[] {
  return Object.entries(index.modules)
    .filter(
      ([key, entry]) =>
        finalName(key) === name ||
        (entry.name !== undefined && finalName(entry.name) === name),
    )
    .map(([key, entry]) => ({ key, entry }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function lookupEntry(
  index: RegistryIndex,
  ref: ModuleRef,
): RegistryMatch | null {
  const explicit = formatModuleRef({
    ...(ref.namespace ? { namespace: ref.namespace } : {}),
    name: ref.name,
  });
  const exact = index.modules[explicit] ?? index.modules[ref.name];
  if (exact) {
    const key = index.modules[explicit] ? explicit : ref.name;
    return { key, entry: exact };
  }
  if (ref.namespace) return null;
  const matches = bareMatches(index, ref.name);
  if (matches.length === 1) return matches[0]!;
  if (matches.length > 1) {
    throw new AmbiguousModuleRefError(
      ref,
      matches.map(({ key }) => key),
    );
  }
  return null;
}
