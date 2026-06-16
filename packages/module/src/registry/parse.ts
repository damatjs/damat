import type { ModuleRef } from "./types";

const REF_PATTERN =
  /^(?:(?<namespace>[a-z][a-z0-9-]*)\/)?(?<name>[a-z][a-z0-9-]*)(?:@(?<version>[\w.^~><=-]+))?$/;

/** Parse a registry module reference. Returns null if it doesn't match. */
export function parseModuleRef(input: string): ModuleRef | null {
  const match = REF_PATTERN.exec(input);
  if (!match?.groups) return null;
  const { namespace, name, version } = match.groups;
  if (!name) return null;
  const ref: ModuleRef = { name };
  if (namespace) ref.namespace = namespace;
  if (version) ref.version = version;
  return ref;
}
