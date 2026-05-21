import path from "node:path";


export function resolveTypesPath(
  moduleResolver: string,
): string {
  return path.join(moduleResolver, "types", "common");
}
