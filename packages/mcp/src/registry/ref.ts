import type { ModuleRef } from "./types";

const REF_PATTERN =
  /^(?:(?<namespace>[a-z][a-z0-9-]*)\/)?(?<name>[a-z][a-z0-9-]*)(?:@(?<version>[\w.^~><=-]+))?$/;

/** Parse "namespace/name@version" into a ModuleRef (namespace/version optional). */
export function parseModuleRef(input: string): ModuleRef | null {
  const match = REF_PATTERN.exec(input.trim());
  if (!match?.groups) return null;
  const { namespace, name, version } = match.groups;
  if (!name) return null;
  const ref: ModuleRef = { name };
  if (namespace) ref.namespace = namespace;
  if (version) ref.version = version;
  return ref;
}

/** Render a ModuleRef back to its canonical "namespace/name@version" string. */
export function formatModuleRef(ref: ModuleRef): string {
  const ns = ref.namespace ? `${ref.namespace}/` : "";
  const v = ref.version ? `@${ref.version}` : "";
  return `${ns}${ref.name}${v}`;
}
