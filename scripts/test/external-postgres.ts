import { SQL } from "bun";
import { buildDatabaseUrls, testDatabases } from "./databases";

function quoteIdentifier(value: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe test database name: ${value}`);
  }
  return `"${value}"`;
}

export async function prepareExternalPostgres(url: string): Promise<{
  url: string;
  packageUrls: Record<string, string>;
}> {
  const sql = new SQL(url, { max: 1 });
  try {
    for (const database of Object.values(testDatabases)) {
      const existing = await sql`
        SELECT 1 FROM pg_database WHERE datname = ${database}
      `;
      if (existing.length === 0) {
        await sql.unsafe(`CREATE DATABASE ${quoteIdentifier(database)}`);
      }
    }
  } finally {
    await sql.close();
  }
  return { url, packageUrls: buildDatabaseUrls(url) };
}
