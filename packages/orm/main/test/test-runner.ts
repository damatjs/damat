// Main Test Runner
import { Pool } from "@damatjs/deps/pg";
import { test1_Connection } from "./test-1-connection";
import { test2_MigrationSQL } from "./test-2-migration";
import { test3_CreateTables } from "./test-3-table-creation";
import { test4_CrudOperations } from "./test-4-crud";
import { test5_Transactions } from "./test-5-transactions";
import { test6_Upsert } from "./test-6-upsert";

console.log("=".repeat(80));
console.log("ORM INTEGRATION TESTS");
console.log("=".repeat(80));

async function run() {
  try {
    const pool = new Pool({
      connectionString:
        "postgres://postgres:Password@0.0.0.0:5432/testt?sslmode=disable",
    });

    await test1_Connection();

    const sqlStatements = await test2_MigrationSQL();

    await test3_CreateTables(pool, sqlStatements);

    await test4_CrudOperations(pool);

    await test5_Transactions(pool);

    await test6_Upsert(pool);

    await pool.query("DROP SCHEMA IF EXISTS orm_test CASCADE");
    await pool.end();

    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL TESTS PASSED!");
    console.log("=".repeat(80));
  } catch (error: any) {
    console.error("\n❌ TEST FAILED:", error.message);
    process.exit(1);
  }
}

run();
