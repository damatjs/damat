/**
 * Database Bootstrap
 *
 * Ensures required database-level functions and extensions exist before any
 * migration runs.  These are idempotent (CREATE … IF NOT EXISTS / OR REPLACE)
 * so they are safe to re-run on every `up` invocation.
 */

import type { Pool } from "@damatjs/deps/pg";

/**
 * `generate_id(prefix TEXT) → TEXT`
 *
 * Generates a prefixed ULID-style ID:  `<prefix>_<ulid>`
 * Relies on the `pgcrypto` extension for `gen_random_bytes`.
 *
 * Example:  generate_id('usr')  →  'usr_01HX...'
 */
export const GENERATE_ID_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION generate_id(prefix TEXT)
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT prefix || '_' || gen_random_uuid()::TEXT;
$$;
`.trim();

/**
 * Run all bootstrap SQL against the database.
 * Called once at the start of every `up` run, before any migration files
 * are executed.
 */
export async function bootstrapDatabase(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(GENERATE_ID_SQL);
  } finally {
    client.release();
  }
}
