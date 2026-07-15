const EXECUTABLE_KEYS = new Set([
  "hook",
  "hooks",
  "script",
  "scripts",
  "command",
  "commands",
  "run",
  "setup",
]);

export function containsExecutableRecipeValue(value: unknown): boolean {
  if (typeof value === "function") return true;
  if (Array.isArray(value)) return value.some(containsExecutableRecipeValue);
  if (typeof value !== "object" || value === null) return false;
  return Object.entries(value).some(
    ([key, item]) =>
      EXECUTABLE_KEYS.has(key.toLowerCase()) ||
      containsExecutableRecipeValue(item),
  );
}
