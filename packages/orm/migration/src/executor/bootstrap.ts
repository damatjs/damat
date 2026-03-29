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
const GENERATE_ID_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION generate_id(prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  -- 10-byte random payload (80 bits) encoded as 16 uppercase base-32 chars
  ts_ms  BIGINT;
  rand   BYTEA;
  chars  TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  result TEXT := '';
  i      INT;
  val    BIGINT;
BEGIN
  ts_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;

  -- Encode 48-bit timestamp (10 chars)
  val := ts_ms;
  FOR i IN REVERSE 9..0 LOOP
    result := substr(chars, (val % 32)::INT + 1, 1) || result;
    val := val / 32;
  END LOOP;

  -- Encode 80 bits of randomness (16 chars) using gen_random_bytes
  rand := gen_random_bytes(10);
  FOR i IN 0..9 LOOP
    val := get_byte(rand, i);
    result := result || substr(chars, (val % 32)::INT + 1, 1)
                     || substr(chars, ((val / 32) % 32)::INT + 1, 1);
  END LOOP;

  RETURN prefix || '_' || result;
END;
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
