export function envExampleTemplate(
  name = "module",
  databaseUrl?: string,
): string {
  const selected =
    databaseUrl ??
    `postgres://postgres:postgres@localhost:5432/${name.replace(/-/g, "_")}`;
  return `DATABASE_URL=${JSON.stringify(selected)}\n`;
}
