// Test 1: Database Connection
import { Pool } from "@damatjs/deps/pg";

export async function test1_Connection() {
  const pool = new Pool({
    connectionString: "postgres://postgres:Password@0.0.0.0:5432/testt?sslmode=disable"
  });

  const client = await pool.connect();
  const result = await client.query("SELECT version()");
  client.release();
  await pool.end();

  if (!result.rows[0]?.version) throw new Error("No version");
  console.log("✅ DB connected:", result.rows[0].version.substring(0, 40));
}
