// Test with pgcrypto extension
import { Pool } from "@damatjs/deps/pg";

async function testWithPgcrypto() {
  const pool = new Pool({
    connectionString:
      "postgres://postgres:Password@0.0.0.0:5432/testt?sslmode=disable",
  });

  // Enable pgcrypto
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  console.log("✅ pgcrypto enabled");

  // Create function (same as bootstrap.ts)
  await pool.query(`
    CREATE OR REPLACE FUNCTION generate_id(prefix TEXT)
    RETURNS TEXT
    LANGUAGE plpgsql
    AS $$
    DECLARE
      ts_ms  BIGINT;
      rand   BYTEA;
      chars  TEXT := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      result TEXT := '';
      i      INT;
      val    BIGINT;
    BEGIN
      ts_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
      val := ts_ms;
      FOR i IN REVERSE 9..0 LOOP
        result := substr(chars, (val % 32)::INT + 1, 1) || result;
        val := val / 32;
      END LOOP;
      rand := gen_random_bytes(10);
      FOR i IN 0..9 LOOP
        val := get_byte(rand, i);
        result := result || substr(chars, (val % 32)::INT + 1, 1)
                         || substr(chars, ((val / 32) % 32)::INT + 1, 1);
      END LOOP;
      RETURN prefix || '_' || result;
    END;
    $$;
  `);

  // Test it
  const result = await pool.query("SELECT generate_id('usr') as id");
  console.log("✅ Generated ID:", result.rows[0].id);

  // Test with actual table
  await pool.query("DROP SCHEMA IF EXISTS test_id CASCADE");
  await pool.query("CREATE SCHEMA test_id");
  await pool.query(`
    CREATE TABLE test_id.users (
      id TEXT PRIMARY KEY DEFAULT generate_id('usr'),
      name TEXT
    )
  `);

  await pool.query(
    "INSERT INTO test_id.users (name) VALUES ('Test') RETURNING id",
  );
  const inserted = await pool.query("SELECT * FROM test_id.users");
  console.log("✅ Auto-generated ID:", inserted.rows[0].id);

  // Test multiple inserts
  await pool.query(
    "INSERT INTO test_id.users (name) VALUES ('Test2'), ('Test3') RETURNING id",
  );
  const all = await pool.query("SELECT id FROM test_id.users");
  console.log(
    "✅ All IDs:",
    all.rows.map((r) => r.id),
  );

  await pool.query("DROP SCHEMA test_id CASCADE");
  await pool.end();

  console.log("✅ Custom ID generation works!");
}

testWithPgcrypto();
