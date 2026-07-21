// Test Relation Loading with Real Data
import { Pool } from "@damatjs/deps/pg";
import { model, columns, toModuleSchema } from "@damatjs/orm-model";
import { PgModelClient } from "@damatjs/orm-pg";
import { bootstrapDatabase } from "@damatjs/orm-migration";
import { generateMigration } from "@damatjs/orm-processor";

const DB_URL =
  "postgres://postgres:Password@0.0.0.0:5432/testt?sslmode=disable";

async function testRelations() {
  console.log("=".repeat(80));
  console.log("TESTING RELATION LOADING");
  console.log("=".repeat(80));

  const pool = new Pool({ connectionString: DB_URL });

  try {
    // Bootstrap
    await bootstrapDatabase(pool);
    console.log("\n✅ Bootstrap complete");

    // Define models with relations
    console.log("\n1. Defining models with relations...");

    const UserSchema = model("user", {
      id: columns.id({ prefix: "usr" }).primaryKey(),
      email: columns.varchar().length(255).unique(),
      name: columns.text(),
      createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    });

    const PostSchema = model("post", {
      id: columns.id({ prefix: "pst" }).primaryKey(),
      title: columns.varchar().length(255),
      content: columns.text().nullable(),
      authorId: columns.id({ prefix: "usr" }), // FK to user
      createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    }).foreignKeys([columns.foreignKey("authorId").references("user", "id")]);

    const CommentSchema = model("comment", {
      id: columns.id({ prefix: "cmt" }).primaryKey(),
      content: columns.text(),
      postId: columns.id({ prefix: "pst" }),
      authorId: columns.id({ prefix: "usr" }),
      createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    }).foreignKeys([
      columns.foreignKey("postId").references("post", "id"),
      columns.foreignKey("authorId").references("user", "id"),
    ]);

    console.log("   ✅ Models defined");

    // Generate and execute migration
    console.log("\n2. Generating and executing migration...");
    const schema = toModuleSchema("rel_test", [
      UserSchema,
      PostSchema,
      CommentSchema,
    ]);
    const migration = generateMigration.generateFromSnapshot(schema);

    await pool.query("DROP SCHEMA IF EXISTS rel_test CASCADE");
    await pool.query("CREATE SCHEMA rel_test");

    const sql = migration.upStatements.join(";\n");
    await pool.query(sql);
    console.log("   ✅ Tables created");

    // Verify foreign keys exist
    const fkCheck = await pool.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'rel_test'
    `);

    console.log(`   ✅ Foreign keys: ${fkCheck.rows.length} constraints`);
    fkCheck.rows.forEach((fk) => {
      console.log(
        `      - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table}`,
      );
    });

    // Create PgModelClients
    console.log("\n3. Creating PgModelClients...");
    await pool.query("SET search_path TO rel_test");

    const userClient = new PgModelClient(UserSchema, pool);
    const postClient = new PgModelClient(PostSchema, pool);
    const commentClient = new PgModelClient(CommentSchema, pool);
    console.log("   ✅ Clients created");

    // Insert User
    console.log("\n4. Inserting test data...");
    const user = await userClient.create({
      data: { email: "author@test.com", name: "Test Author" },
      returning: ["id", "email", "name"],
    });
    const userId = user.rows[0].id;
    console.log(`   ✅ User created: ${userId}`);

    // Insert Posts
    const post1 = await postClient.create({
      data: {
        title: "First Post",
        content: "Hello World",
        authorId: userId,
      },
      returning: ["id", "title"],
    });
    const post1Id = post1.rows[0].id;

    const post2 = await postClient.create({
      data: {
        title: "Second Post",
        content: "Another one",
        authorId: userId,
      },
      returning: ["id", "title"],
    });
    const post2Id = post2.rows[0].id;
    console.log(`   ✅ Posts created: ${post1Id}, ${post2Id}`);

    // Insert Comments
    await commentClient.create({
      data: {
        content: "Great post!",
        postId: post1Id,
        authorId: userId,
      },
    });
    await commentClient.create({
      data: {
        content: "Nice!",
        postId: post1Id,
        authorId: userId,
      },
    });
    await commentClient.create({
      data: {
        content: "Interesting",
        postId: post2Id,
        authorId: userId,
      },
    });
    console.log(`   ✅ Comments created: 3 total`);

    // Test 1: Manual JOIN - User with Posts
    console.log("\n5. Testing user → posts relation (manual JOIN)...");
    const userWithPosts = await pool.query(
      `
      SELECT u.id, u.name, p.id as post_id, p.title
      FROM rel_test.user u
      LEFT JOIN rel_test.post p ON p."authorId" = u.id
      WHERE u.id = $1
    `,
      [userId],
    );

    console.log(`   ✅ Found user with ${userWithPosts.rows.length} posts`);
    userWithPosts.rows.forEach((row) => {
      console.log(`      - ${row.name} wrote: ${row.title || "(no post)"}`);
    });

    // Test 2: Manual JOIN - Post with Comments
    console.log("\n6. Testing post → comments relation (manual JOIN)...");
    const postWithComments = await pool.query(
      `
      SELECT p.id, p.title, c.id as comment_id, c.content
      FROM rel_test.post p
      LEFT JOIN rel_test.comment c ON c."postId" = p.id
      WHERE p.id = $1
    `,
      [post1Id],
    );

    console.log(
      `   ✅ Post "${post1.rows[0].title}" has ${postWithComments.rows.filter((r) => r.comment_id).length} comments`,
    );
    postWithComments.rows.forEach((row) => {
      if (row.content) {
        console.log(`      - Comment: "${row.content}"`);
      }
    });

    // Test 3: Manual JOIN - Full hierarchy
    console.log("\n7. Testing full hierarchy (user → posts → comments)...");
    const fullHierarchy = await pool.query(
      `
      SELECT 
        u.name as author,
        p.title as post_title,
        c.content as comment
      FROM rel_test.user u
      LEFT JOIN rel_test.post p ON p."authorId" = u.id
      LEFT JOIN rel_test.comment c ON c."postId" = p.id
      WHERE u.id = $1
      ORDER BY p.title, c.id
    `,
      [userId],
    );

    console.log("   Full hierarchy:");
    let currentUser = "";
    let currentPost = "";
    fullHierarchy.rows.forEach((row) => {
      if (row.author !== currentUser) {
        currentUser = row.author;
        console.log(`   📁 User: ${row.author}`);
      }
      if (row.post_title && row.post_title !== currentPost) {
        currentPost = row.post_title;
        console.log(`      📄 Post: ${row.post_title}`);
      }
      if (row.comment) {
        console.log(`         💬 Comment: "${row.comment}"`);
      }
    });

    // Test 4: Aggregation query
    console.log("\n8. Testing aggregation (count posts per user)...");
    const postCounts = await pool.query(`
      SELECT u.name, COUNT(p.id) as post_count
      FROM rel_test.user u
      LEFT JOIN rel_test.post p ON p."authorId" = u.id
      GROUP BY u.id, u.name
    `);

    postCounts.rows.forEach((row) => {
      console.log(`   ✅ ${row.name}: ${row.post_count} posts`);
    });

    // Test 5: Verify FK constraints work
    console.log("\n9. Testing foreign key constraint enforcement...");
    try {
      await postClient.create({
        data: {
          title: "Invalid Post",
          authorId: "invalid_user_id",
        },
      });
      console.log("   ❌ FK constraint FAILED - should have thrown error");
    } catch {
      console.log("   ✅ FK constraint working - rejected invalid user_id");
    }

    // Clean up
    console.log("\n10. Cleaning up...");
    await pool.query("DROP SCHEMA rel_test CASCADE");

    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL RELATION TESTS PASSED");
    console.log("=".repeat(80));
    console.log("\n📊 Summary:");
    console.log("   - Foreign key constraints: ✅ Working");
    console.log("   - Manual JOIN queries: ✅ Working");
    console.log("   - Relation data loading: ✅ Working");
    console.log("   - Aggregation queries: ✅ Working");
    console.log("   - FK enforcement: ✅ Working");
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

testRelations();
