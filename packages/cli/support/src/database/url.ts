import type { DatabaseFields } from "./types";

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

export function validateDatabaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (
    !POSTGRES_PROTOCOLS.has(parsed.protocol) ||
    !parsed.pathname ||
    parsed.pathname === "/"
  ) {
    throw new Error(
      "DATABASE_URL must use postgres:// and include a database name",
    );
  }
  return value;
}

export function buildDatabaseUrl(
  fields: DatabaseFields,
  defaultDatabase: string,
): string {
  const url = new URL("postgres://localhost");
  url.hostname = fields.host || "localhost";
  url.port = String(fields.port || 5432);
  url.username = fields.user || "postgres";
  url.password = fields.password ?? "postgres";
  url.pathname = `/${fields.database || defaultDatabase}`;
  return url.toString();
}

export function databaseName(value: string): string {
  return value.replace(/-/g, "_");
}
