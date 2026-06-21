/**
 * snake_case / kebab-case / spaced → camelCase.
 *
 * The table name, exactly as written (no pluralizing/singularizing), turned
 * into a valid JS identifier: `ai_sessions` → `aiSessions`, `accounts` →
 * `accounts`, `account` → `account`. Used for BOTH the service accessor
 * (`service.<camel>`) and the route/workflow resource folder, so they match.
 */
export function toCamelCaseCodeGen(str: string): string {
  return str
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part, i) =>
      i === 0
        ? part.charAt(0).toLowerCase() + part.slice(1)
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}
