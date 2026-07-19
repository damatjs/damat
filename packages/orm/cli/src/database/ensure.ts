export interface DatabaseClient {
  connect(): Promise<unknown>;
  query(sql: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
  end(): Promise<void>;
}

export type DatabaseClientFactory = (
  connectionString: string,
) => DatabaseClient | Promise<DatabaseClient>;

const errorCode = (error: unknown) =>
  typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";

function databaseDetails(connectionString: string) {
  const url = new URL(connectionString);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (!database) throw new Error("DATABASE_URL must include a database name");
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  return { database, adminUrl: adminUrl.toString() };
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function defaultClientFactory(url: string): Promise<DatabaseClient> {
  const { Client } = await import("@damatjs/deps/pg");
  return new Client({ connectionString: url });
}

export async function ensurePostgresDatabase(
  connectionString: string,
  factory: DatabaseClientFactory = defaultClientFactory,
): Promise<{ created: boolean }> {
  const { database, adminUrl } = databaseDetails(connectionString);
  const target = await factory(connectionString);
  try {
    await target.connect();
    return { created: false };
  } catch (error) {
    if (errorCode(error) !== "3D000") throw error;
  } finally {
    await target.end();
  }
  const admin = await factory(adminUrl);
  try {
    await admin.connect();
    const result = await admin.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [database],
    );
    if (result.rows.length > 0) return { created: false };
    try {
      await admin.query(`CREATE DATABASE ${quoteIdentifier(database)}`);
    } catch (error) {
      if (errorCode(error) !== "42P04") throw error;
    }
    return { created: true };
  } finally {
    await admin.end();
  }
}
