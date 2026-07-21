export function assertSafeRelativePath(value: string, name: string): string {
  const segments = value.split("/");
  const unsafe =
    value.includes("\\") ||
    value.startsWith("/") ||
    /^[A-Za-z]:/.test(value) ||
    segments.includes("..");
  if (unsafe) throw new TypeError(`${name} must stay inside its root`);
  return value;
}
