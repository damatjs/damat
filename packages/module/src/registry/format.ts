import type { ModuleRef } from "./types";

/** Format a ModuleRef back to its canonical string form */
export function formatModuleRef(ref: ModuleRef): string {
  const namespace = ref.namespace ? `${ref.namespace}/` : "";
  const version = ref.version ? `@${ref.version}` : "";
  return `${namespace}${ref.name}${version}`;
}
