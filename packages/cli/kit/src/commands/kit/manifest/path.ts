export function targetPathError(target: string): string | null {
  if (!target) return "must be non-empty";
  if (target.startsWith("/") || target.startsWith("\\") || /^[A-Za-z]:/.test(target)) {
    return "must be relative";
  }
  const unsafe = target.split(/[\\/]+/).some((part) => part === ".." || part === ".");
  return unsafe ? "must not contain .. or ." : null;
}
