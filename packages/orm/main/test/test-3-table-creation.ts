// Test 3: Create Tables
import { Pool } from "@damatjs/deps/pg";

export async function test3_CreateTables(pool: Pool, sqlStatements: string[]) {
  await pool.query("DROP SCHEMA IF EXISTS orm_test CASCADE");
  await pool.query("CREATE SCHEMA orm_test");

  // Replace public with orm_test schema
  const sql = sqlStatements
    .map((s) => s.replace(/"public"\./g, '"orm_test".'))
    .join(";\n");

  try {
    await pool.query(sql);

    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'orm_test'
    `);

    console.log(
      "✅ Tables created:",
      result.rows.map((r) => r.table_name).join(", "),
    );
    return true;
  } catch (error: any) {
    console.log("❌ Table creation failed:", error.message);
    throw error;
  }
}
