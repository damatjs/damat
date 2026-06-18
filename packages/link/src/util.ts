/**
 * Lowercase the first character only — the exact rule `@damatjs/services` uses
 * to turn a model-map key into its service accessor (e.g. `User` -> `user`).
 * Replicated here so the link package does not reach into the service package's
 * internals.
 */
export function toCamelCase(name: string): string {
  if (!name) return name;
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** Turn a snake_case table name into a camelCase identifier (`user_org` -> `userOrg`). */
export function snakeToCamel(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Deterministically shorten an identifier to Postgres' 63-byte limit, keeping a
 * readable prefix and appending a short stable hash so distinct long names never
 * collapse onto the same truncated value.
 */
export function clampIdentifier(name: string, max = 63): string {
  if (name.length <= max) return name;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const suffix = `_${(hash >>> 0).toString(36)}`;
  return name.slice(0, max - suffix.length) + suffix;
}
