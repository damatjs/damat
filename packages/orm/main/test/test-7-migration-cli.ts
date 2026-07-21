// Test Migration CLI Commands
import { Pool } from "@damatjs/deps/pg";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import {
  model,
  columns,
  toModuleSchema,
  saveSnapshot,
} from "@damatjs/orm-model";
import { generateFromSnapshot } from "@damatjs/orm-processor";
import { bootstrapDatabase } from "@damatjs/orm-migration";

const DB_URL =
  "postgres://postgres:Password@0.0.0.0:5432/testt?sslmode=disable";

async function testMigrationCLI() {
  console.log("=".repeat(80));
  console.log("TESTING MIGRATION CLI COMMANDS");
  console.log("=".repeat(80));

  const pool = new Pool({ connectionString: DB_URL });
  const testDir = "/tmp/orm-test-module";

  try {
    // 1. Bootstrap Database
    console.log("\n1. Testing bootstrapDatabase()");
    await bootstrapDatabase(pool);

    // Verify function exists
    const funcCheck = await pool.query(`
      SELECT proname FROM pg_proc WHERE proname = 'generate_id'
    `);
    if (funcCheck.rows.length === 0) {
      throw new Error("generate_id function not created");
    }
    console.log("   ✅ Bootstrap: generate_id() function created");

    // 2. Create test module structure
    console.log("\n2. Creating test module structure");
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, "models"), { recursive: true });
    mkdirSync(join(testDir, "migrations"), { recursive: true });

    // Write model file
    const modelCode = `
import { model, columns } from "@damatjs/orm-model";

export const PostSchema = model("post", {
  id: columns.id({ prefix: "pst" }).primaryKey(),
  title: columns.varchar().length(255),
  content: columns.text().nullable(),
  authorId: columns.id({ prefix: "usr" }),
  createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
}).indexes([
  columns.indexes("idx_posts_author").columns(["authorId"]),
]);
`;
    writeFileSync(join(testDir, "models/post.ts"), modelCode);
    console.log("   ✅ Module structure created");

    // 3. Generate initial migration
    console.log("\n3. Testing migration generation");
    const PostSchema = model("post", {
      id: columns.id({ prefix: "pst" }).primaryKey(),
      title: columns.varchar().length(255),
      content: columns.text().nullable(),
      authorId: columns.text(),
      createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    });

    const moduleSchema = toModuleSchema("test_cli", [PostSchema]);
    saveSnapshot(
      moduleSchema,
      join(testDir, "migrations/schema-snapshot.json"),
    );

    const migration = generateFromSnapshot(moduleSchema);
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, "");
    const migrationFile = `Migration${timestamp}_Initial.sql`;

    writeFileSync(
      join(testDir, "migrations", migrationFile),
      migration.upStatements.join(";\n\n"),
    );
    console.log(`   ✅ Migration generated: ${migrationFile}`);
    console.log(`   📊 Statements: ${migration.upStatements.length}`);

    // 4. Execute migration
    console.log("\n4. Testing migration execution");
    await pool.query("DROP SCHEMA IF EXISTS test_cli CASCADE");
    await pool.query("CREATE SCHEMA test_cli");

    await pool.query("SET search_path TO test_cli");
    const sql = migration.upStatements
      .map((s) => s.replace(/"public"\./g, '"test_cli".'))
      .join(";\n");
    await pool.query(sql);

    // Verify table created
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'test_cli'
    `);
    console.log(
      `   ✅ Tables created: ${tables.rows.map((r) => r.table_name).join(", ")}`,
    );

    // 5. Test snapshot persistence
    console.log("\n5. Testing snapshot persistence");
    if (!existsSync(join(testDir, "migrations/schema-snapshot.json"))) {
      throw new Error("Snapshot not saved");
    }
    console.log("   ✅ Snapshot saved to disk");

    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL MIGRATION CLI TESTS PASSED");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    throw error;
  } finally {
    await pool.query("DROP SCHEMA IF EXISTS test_cli CASCADE");
    await pool.end();
    rmSync(testDir, { recursive: true, force: true });
  }
}

testMigrationCLI();
