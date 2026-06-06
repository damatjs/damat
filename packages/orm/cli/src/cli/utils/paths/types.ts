import path from "node:path";

/**
 * Resolve the output directory for auto-generated TypeScript types.
 *
 * Convention: `{moduleResolver}/types/`
 *
 * @param moduleResolver - Absolute path to the module root directory.
 */
export function resolveTypesPath(moduleResolver: string): string {
  return path.join(moduleResolver, "types");
}
