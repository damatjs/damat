// Test generate_id function - simpler version
import { Pool } from "@damatjs/deps/pg";

async function testGenerateId() {
  const pool = new Pool({
    connectionString: "postgres://postgres:Password@0.0.0.0:5432/testt?sslmode=disable"
  });

  // Create the function using pgcrypto or timestamp+random
  await pool.query(`
    CREATE OR REPLACE FUNCTION generate_id(prefix TEXT)
    RETURNS TEXT AS $$
    DECLARE
      ts_part TEXT;
      rand_part TEXT;
    BEGIN
      -- Timestamp part (13 digits)
      ts_part := to_char(now(), 'YYYYMMDDHH24MISS');
      -- Random part (6 chars)
      rand_part := substring(md5(random()::text), 1, 6);
      RETURN concat(prefix, '_', ts_part, '_', rand_part);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Test it
  const result = await pool.query("SELECT generate_id('usr') as id");
  console.log("✅ Generated ID:", result.rows[0].id);

  // Test with table default
  await pool.query("DROP SCHEMA IF EXISTS test_id CASCADE");
  await pool.query("CREATE SCHEMA test_id");
  await pool.query(`
    CREATE TABLE test_id.users (
      id TEXT PRIMARY KEY DEFAULT generate_id('usr'),
      name TEXT
    )
  `);

  await pool.query("INSERT INTO test_id.users (name) VALUES ('Test') RETURNING id, name");
  const inserted = await pool.query("SELECT * FROM test_id.users");
  console.log("✅ Auto-generated ID in table:", inserted.rows[0].id);

  await pool.query("DROP SCHEMA test_id CASCADE");
  await pool.end();
}

testGenerateId();
