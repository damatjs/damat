/**
 * ORM Full Integration Test - Complete Test Suite
 */

import { Pool } from "@damatjs/deps/pg";
import { model, columns, toModuleSchema } from "@damatjs/orm-model";
import { generateMigration } from "@damatjs/orm-processor";
import { PgModelClient } from "@damatjs/orm-pg";

const DATABASE_URL =
  "postgres://postgres:Password@0.0.0.0:5432/testt?sslmode=disable";

const results = {
  passed: [] as string[],
  failed: [] as string[],
  errors: [] as Error[],
};

function test(name: string, fn: () => Promise<void> | void) {
  return {
    name,
    run: async () => {
      try {
        await fn();
        results.passed.push(name);
        console.log(`  ✅ ${name}`);
      } catch (error) {
        results.failed.push(name);
        results.errors.push(
          error instanceof Error ? error : new Error(String(error)),
        );
        console.log(`  ❌ ${name}`);
        console.log(
          `     Error: ${error instanceof Error ? error.message : error}`,
        );
      }
    },
  };
}

async function main() {
  console.log("=".repeat(80));
  console.log("ORM FULL INTEGRATION TEST - REAL DATABASE");
  console.log("=".repeat(80));
  console.log("");

  let pool: Pool;

  // Models with TEXT ID instead of custom ID function
  const UserSchema = model("user", {
    id: columns.text().primaryKey(),
    email: columns.varchar().length(255).unique(),
    name: columns.text().nullable(),
    verified: columns.boolean().default(false),
    createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    updatedAt: columns.timestamp({ withTimezone: true }).defaultNow(),
  }).indexes([columns.indexes("idx_users_email").columns(["email"]).unique()]);

  const PostSchema = model("post", {
    id: columns.text().primaryKey(),
    title: columns.varchar().length(255),
    content: columns.text().nullable(),
    published: columns.boolean().default(false),
    authorId: columns.text(),
    createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
  }).indexes([columns.indexes("idx_posts_author").columns(["authorId"])]);

  const CommentSchema = model("comment", {
    id: columns.text().primaryKey(),
    content: columns.text(),
    postId: columns.text(),
    authorId: columns.text(),
    createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
  }).indexes([columns.indexes("idx_comments_post").columns(["postId"])]);

  const blogModule = toModuleSchema("blog", [
    UserSchema,
    PostSchema,
    CommentSchema,
  ]);

  const tests = [
    test("1.1 Connect to PostgreSQL", async () => {
      pool = new Pool({ connectionString: DATABASE_URL });
      const client = await pool.connect();
      const result = await client.query("SELECT version()");
      client.release();
      if (!result.rows[0]?.version) throw new Error("No version returned");
      console.log(
        `     DB Version: ${result.rows[0].version.substring(0, 40)}...`,
      );
    }),

    test("1.2 Create test schema", async () => {
      await pool.query("DROP SCHEMA IF EXISTS blog_test CASCADE");
      await pool.query("CREATE SCHEMA blog_test");
    }),

    test("2.1 Generate initial migration SQL", async () => {
      const migration = generateMigration.generateFromSnapshot(blogModule);
      if (migration.upStatements.length === 0)
        throw new Error("No SQL generated");
      if (!migration.upStatements.some((s) => s.includes("CREATE TABLE"))) {
        throw new Error("No CREATE TABLE statements");
      }
      console.log(
        `     Generated ${migration.upStatements.length} SQL statements`,
      );
    }),

    test("2.2 Validate SQL is correct", async () => {
      const migration = generateMigration.generateFromSnapshot(blogModule);
      const sql = migration.upStatements
        .map((s) => s.replace(/public\./g, "blog_test."))
        .join(";\n");

      await pool.query("BEGIN");
      try {
        await pool.query(sql);
        await pool.query("ROLLBACK");
      } catch (error) {
        await pool.query("ROLLBACK");
        throw error;
      }
    }),

    test("3.1 Execute migration", async () => {
      const migration = generateMigration.generateFromSnapshot(blogModule);
      const sql = migration.upStatements
        .map((s) => s.replace(/public\./g, "blog_test."))
        .join(";\n");

      await pool.query(sql);

      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'blog_test'
        ORDER BY table_name
      `);

      const tables = result.rows.map((r) => r.table_name);
      if (!tables.includes("user")) throw new Error("user table not created");
      if (!tables.includes("post")) throw new Error("post table not created");
      if (!tables.includes("comment"))
        throw new Error("comment table not created");
      console.log(`     Created: ${tables.join(", ")}`);
    }),

    test("3.2 Verify table structure", async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'blog_test' AND table_name = 'user'
        ORDER BY ordinal_position
      `);

      if (result.rows.length === 0) throw new Error("No columns found");
      const columns = result.rows.map((r) => r.column_name);
      if (!columns.includes("id")) throw new Error("id column missing");
      if (!columns.includes("email")) throw new Error("email column missing");
      console.log(`     User has ${result.rows.length} columns`);
    }),

    test("4.1 Create PgModelClient", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);
      if (!userClient.accessor) throw new Error("No accessor created");
    }),

    test("4.2 INSERT single row", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      const result = await userClient.create({
        data: {
          id: "usr_test1",
          email: "test1@example.com",
          name: "Test User 1",
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        returning: ["id", "email", "name"],
      });

      if (result.rows.length !== 1) throw new Error("No rows returned");
      if (result.rows[0].id !== "usr_test1") throw new Error("Wrong id");
      console.log(`     Created: ${result.rows[0].email}`);
    }),

    test("4.3 SELECT multiple rows", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      await userClient.create({
        data: {
          id: "usr_test2",
          email: "test2@example.com",
          name: "Test User 2",
          verified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await userClient.findMany({
        select: ["id", "email", "name", "verified"],
      });

      if (result.rows.length < 2)
        throw new Error(`Expected >= 2 rows, got ${result.rows.length}`);
      console.log(`     Found ${result.rows.length} users`);
    }),

    test("4.4 SELECT with WHERE", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      const result = await userClient.findMany({
        select: ["id", "email", "verified"],
        where: { verified: true },
      });

      if (result.rows.length === 0) throw new Error("No verified users");
      if (!result.rows.every((r) => r.verified === true)) {
        throw new Error("WHERE clause not working");
      }
      console.log(`     Found ${result.rows.length} verified users`);
    }),

    test("4.5 SELECT one row", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      const result = await userClient.findOne({
        where: { email: "test1@example.com" },
      });

      if (result.rows.length !== 1) throw new Error("Expected 1 row");
      if (result.rows[0].email !== "test1@example.com")
        throw new Error("Wrong user");
      console.log(`     Found: ${result.rows[0].name}`);
    }),

    test("4.6 UPDATE rows", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      const result = await userClient.update({
        set: { verified: true, name: "Test User 1 Updated" },
        where: { id: "usr_test1" },
        returning: ["id", "verified", "name"],
      });

      if (result.rows.length !== 1) throw new Error("No rows returned");
      if (result.rows[0].verified !== true) throw new Error("not updated");
      if (result.rows[0].name !== "Test User 1 Updated")
        throw new Error("name not updated");
      console.log(`     Updated: ${result.rows[0].name}`);
    }),

    test("4.7 DELETE rows", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      await userClient.create({
        data: {
          id: "usr_temp",
          email: "temp@example.com",
          name: "Temp",
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const result = await userClient.delete({
        where: { id: "usr_temp" },
        returning: ["id"],
      });

      if (result.rows.length !== 1) throw new Error("No rows returned");

      const check = await userClient.findOne({ where: { id: "usr_temp" } });
      if (check.rows.length !== 0) throw new Error("User not deleted");
      console.log(`     Deleted: ${result.rows[0].id}`);
    }),

    test("4.8 Batch INSERT", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      const result = await userClient.createMany({
        data: [
          {
            id: "usr_batch1",
            email: "batch1@example.com",
            name: "Batch 1",
            verified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "usr_batch2",
            email: "batch2@example.com",
            name: "Batch 2",
            verified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        returning: ["id", "email"],
      });

      if (result.rows.length !== 2) throw new Error("Expected 2 rows");
      if (result.rowCount !== 2) throw new Error("rowCount should be 2");
      console.log(`     Created ${result.rowCount} users`);
    }),

    test("5.1 Transaction commit", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      await userClient.transaction(async (tx) => {
        await tx.create({
          data: {
            id: "usr_tx1",
            email: "tx1@example.com",
            name: "TX User 1",
            verified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await tx.create({
          data: {
            id: "usr_tx2",
            email: "tx2@example.com",
            name: "TX User 2",
            verified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      });

      const check1 = await userClient.findOne({ where: { id: "usr_tx1" } });
      const check2 = await userClient.findOne({ where: { id: "usr_tx2" } });

      if (check1.rows.length === 0) throw new Error("tx1 not created");
      if (check2.rows.length === 0) throw new Error("tx2 not created");
      console.log(`     Transaction created 2 users`);
    }),

    test("5.2 Transaction rollback", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      try {
        await userClient.transaction(async (tx) => {
          await tx.create({
            data: {
              id: "usr_rollback",
              email: "rollback@example.com",
              name: "Rollback",
              verified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          throw new Error("Intentional error");
        });
      } catch {
        // Expected
      }

      const check = await userClient.findOne({ where: { id: "usr_rollback" } });
      if (check.rows.length !== 0)
        throw new Error("Transaction did not rollback");
      console.log(`     Rollback prevented partial commit`);
    }),

    test("6.1 UPSERT insert", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      const result = await userClient.upsert({
        data: {
          id: "usr_upsert1",
          email: "upsert1@example.com",
          name: "Upsert User",
          verified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        onConflict: ["email"],
        updateColumns: ["name", "verified"],
        returning: ["id", "email", "name"],
      });

      if (result.rows.length !== 1) throw new Error("Upsert failed");
      console.log(`     Inserted: ${result.rows[0].email}`);
    }),

    test("6.2 UPSERT update", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      const result = await userClient.upsert({
        data: {
          id: "usr_upsert_different_id",
          email: "upsert1@example.com", // Same email
          name: "Upsert User Updated",
          verified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        onConflict: ["email"],
        updateColumns: ["name", "verified"],
        returning: ["id", "email", "name", "verified"],
      });

      if (result.rows[0].name !== "Upsert User Updated") {
        throw new Error("Upsert did not update");
      }
      console.log(`     Updated: ${result.rows[0].name}`);
    }),

    test("7.1 ORDER BY and LIMIT", async () => {
      await pool.query("SET search_path TO blog_test");
      const userClient = new PgModelClient(UserSchema, pool);

      const result = await userClient.findMany({
        select: ["id", "email", "name"],
        orderBy: [{ column: "createdAt", direction: "DESC" }],
        limit: 5,
      });

      if (result.rows.length === 0) throw new Error("No rows");
      console.log(`     Retrieved ${result.rows.length} rows`);
    }),

    test("8.1 Create posts", async () => {
      await pool.query("SET search_path TO blog_test");
      const postClient = new PgModelClient(PostSchema, pool);

      const result = await postClient.create({
        data: {
          id: "pst_test1",
          title: "Test Post",
          content: "Test content",
          published: true,
          authorId: "usr_test1",
          createdAt: new Date(),
        },
        returning: ["id", "title", "authorId"],
      });

      if (result.rows.length !== 1) throw new Error("Post not created");
      console.log(`     Created post: ${result.rows[0].title}`);
    }),

    test("8.2 Manual JOIN query", async () => {
      await pool.query("SET search_path TO blog_test");

      const result = await pool.query(`
        SELECT p.id, p.title, u.name as author_name
        FROM blog_test.post p
        JOIN blog_test.user u ON p."authorId" = u.id
        WHERE p.id = 'pst_test1'
      `);

      if (result.rows.length === 0) throw new Error("Join query failed");
      if (!result.rows[0].author_name) throw new Error("No author data");
      console.log(
        `     Join: ${result.rows[0].title} by ${result.rows[0].author_name}`,
      );
    }),

    test("9.1 Cleanup", async () => {
      await pool.query("DROP SCHEMA IF EXISTS blog_test CASCADE");
      await pool.end();
      console.log(`     Schema dropped & pool closed`);
    }),
  ];

  console.log("🧪 RUNNING TESTS");
  console.log("-".repeat(80));
  console.log("");

  for (const t of tests) {
    await t.run();
  }

  console.log("");
  console.log("=".repeat(80));
  console.log("TEST RESULTS");
  console.log("=".repeat(80));
  console.log(`  ✅ Passed: ${results.passed.length}`);
  console.log(`  ❌ Failed: ${results.failed.length}`);
  console.log(`  📊 Total:  ${tests.length}`);
  console.log("");

  if (results.failed.length > 0) {
    console.log("❌ FAILED TESTS:");
    results.failed.forEach((name, i) => {
      console.log(`  ${i + 1}. ${name}`);
      const error = results.errors[i];
      if (error) {
        console.log(`     ${error.message.substring(0, 100)}`);
      }
    });
    console.log("");
  }

  if (results.passed.length === tests.length) {
    console.log("✅ ALL TESTS PASSED!");
    process.exit(0);
  } else {
    console.log("⚠️  SOME TESTS FAILED");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
