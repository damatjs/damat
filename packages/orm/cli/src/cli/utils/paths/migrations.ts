import path from "node:path";

export function resolveMigrationsPath(
  moduleResolver: string
): string {
  return path.join(moduleResolver, "migrations");
}
