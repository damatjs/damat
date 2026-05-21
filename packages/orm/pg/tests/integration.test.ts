import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Pool } from "@damatjs/deps/pg";
import { model, columns, toModuleSchema } from "@damatjs/orm-model";
import { generateMigration } from "@damatjs/orm-processor";
import { PgModelClient, PgEntityManager } from "../src";

const DATABASE_URL = "postgres://postgres:Password@0.0.0.0:5432/testt?sslmode=disable";

describe("ORM PostgreSQL Integration Tests", () => {
  let pool: Pool;

  // Schema Definitions
  // Explicitly set schema to "blog_test" to test schema qualification
  const UserSchema = model(
    "user",
    {
      id: columns.text().primaryKey(),
      email: columns.varchar().length(255).unique(),
      name: columns.text().nullable(),
      verified: columns.boolean().default(false),
      createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
      updatedAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    },
    { schema: "blog_test" }
  ).indexes([
    columns.indexes("idx_users_email").columns(["email"]).unique(),
  ]);

  const PostSchema = model(
    "post",
    {
      id: columns.text().primaryKey(),
      title: columns.varchar().length(255),
      content: columns.text().nullable(),
      published: columns.boolean().default(false),
      authorId: columns.text(),
      createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    },
    { schema: "blog_test" }
  ).indexes([
    columns.indexes("idx_posts_author").columns(["authorId"]),
  ]);

  const CommentSchema = model(
    "comment",
    {
      id: columns.text().primaryKey(),
      content: columns.text(),
      postId: columns.text(),
      authorId: columns.text(),
      createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    },
    { schema: "blog_test" }
  ).indexes([
    columns.indexes("idx_comments_post").columns(["postId"]),
  ]);

  const blogModule = toModuleSchema("blog_test", [UserSchema, PostSchema, CommentSchema], {
    schema: "blog_test",
  });

  beforeAll(async () => {
    pool = new Pool({ connectionString: DATABASE_URL });
    
    // Set up test schema
    await pool.query("DROP SCHEMA IF EXISTS blog_test CASCADE");
    await pool.query("CREATE SCHEMA blog_test");

    // Generate and execute migrations
    const migration = generateMigration.generateFromSnapshot(blogModule);
    const sql = migration.upStatements.join(";\n");
    await pool.query(sql);
  });

  afterAll(async () => {
    await pool.query("DROP SCHEMA IF EXISTS blog_test CASCADE");
    await pool.end();
  });

  describe("1. Connection & Setup", () => {
    test("1.1 Connection to PostgreSQL", async () => {
      const client = await pool.connect();
      const result = await client.query("SELECT version()");
      client.release();
      expect(result.rows[0].version).toBeDefined();
    });

    test("1.2 Tables created in blog_test schema", async () => {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'blog_test'
        ORDER BY table_name
      `);
      const tables = result.rows.map(r => r.table_name);
      expect(tables).toContain("user");
      expect(tables).toContain("post");
      expect(tables).toContain("comment");
    });
  });

  describe("2. Standalone PgModelClient CRUD", () => {
    let userClient: PgModelClient<any>;

    beforeAll(() => {
      userClient = new PgModelClient(UserSchema, pool);
    });

    test("2.1 INSERT single row", async () => {
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
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe("usr_test1");
      expect(result.rows[0].email).toBe("test1@example.com");
    });

    test("2.2 SELECT multiple rows", async () => {
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
      expect(result.rows.length).toBeGreaterThanOrEqual(2);
    });

    test("2.3 SELECT with WHERE", async () => {
      const result = await userClient.findMany({
        select: ["id", "email", "verified"],
        where: { verified: true },
      });
      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      expect(result.rows.every(r => r.verified === true)).toBe(true);
    });

    test("2.4 SELECT one row", async () => {
      const result = await userClient.findOne({
        where: { email: "test1@example.com" },
      });
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe("test1@example.com");
    });

    test("2.5 UPDATE rows", async () => {
      const result = await userClient.update({
        set: { verified: true, name: "Test User 1 Updated" },
        where: { id: "usr_test1" },
        returning: ["id", "verified", "name"],
      });
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].verified).toBe(true);
      expect(result.rows[0].name).toBe("Test User 1 Updated");
    });

    test("2.6 UPSERT insert", async () => {
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
        set: {
          name: "Upsert User",
          verified: false,
        },
        returning: ["id", "email", "name"],
      });
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe("upsert1@example.com");
    });

    test("2.7 UPSERT update", async () => {
      const result = await userClient.upsert({
        data: {
          id: "usr_upsert_different_id",
          email: "upsert1@example.com",
          name: "Upsert User Updated",
          verified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        onConflict: ["email"],
        set: {
          name: "Upsert User Updated",
          verified: true,
        },
        returning: ["id", "email", "name", "verified"],
      });
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].verified).toBe(true);
      expect(result.rows[0].name).toBe("Upsert User Updated");
    });

    test("2.8 DELETE rows", async () => {
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

      const deleteRes = await userClient.delete({
        where: { id: "usr_temp" },
      });
      expect(deleteRes.rowCount).toBe(1);
    });
  });

  describe("3. Entity Manager Dynamic Model Accessors & Transaction", () => {
    let db: any;

    beforeAll(async () => {
      db = new PgEntityManager({
        pool,
        models: {
          user: UserSchema,
          post: PostSchema,
        },
      });
    });

    test("3.1 Dynamic model repository access (db.user)", async () => {
      const user = await db.user.findOne({
        where: { id: "usr_test1" },
      });
      expect(user).toBeDefined();
      expect(user.id).toBe("usr_test1");
    });

    test("3.2 Transaction commit with dynamic properties (tx.user)", async () => {
      await db.transaction(async (tx: any) => {
        await tx.user.create({
          data: {
            id: "usr_tx1",
            email: "tx1@example.com",
            name: "TX User 1",
            verified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      });

      const user = await db.user.findOne({
        where: { id: "usr_tx1" },
      });
      expect(user).toBeDefined();
      expect(user.email).toBe("tx1@example.com");
    });

    test("3.3 Transaction rollback", async () => {
      try {
        await db.transaction(async (tx: any) => {
          await tx.user.create({
            data: {
              id: "usr_rollback",
              email: "rollback@example.com",
              name: "Rollback",
              verified: false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          throw new Error("Trigger Rollback");
        });
      } catch (e: any) {
        expect(e.message).toBe("Trigger Rollback");
      }

      const user = await db.user.findOne({
        where: { id: "usr_rollback" },
      });
      expect(user).toBeUndefined();
    });
  });

  describe("4. Relations & Constraints", () => {
    let db: any;

    beforeAll(() => {
      db = new PgEntityManager({
        pool,
        models: {
          user: UserSchema,
          post: PostSchema,
          comment: CommentSchema,
        },
      });
    });

    test("4.1 Create relation records and test manual JOIN query", async () => {
      // Create user, posts, and comment
      await db.post.create({
        data: {
          id: "pst_test1",
          title: "Test Post",
          content: "Test content",
          published: true,
          authorId: "usr_test1",
          createdAt: new Date(),
        },
      });

      await db.comment.create({
        data: {
          id: "cmt_test1",
          content: "Test Comment",
          postId: "pst_test1",
          authorId: "usr_test1",
          createdAt: new Date(),
        },
      });

      // Run manual JOIN raw query
      const joinResult = await db.execute(`
        SELECT u.name as author_name, p.title as post_title, c.content as comment_content
        FROM blog_test.user u
        JOIN blog_test.post p ON p."authorId" = u.id
        JOIN blog_test.comment c ON c."postId" = p.id
        WHERE u.id = $1
      `, ["usr_test1"]);

      expect(joinResult.rows.length).toBe(1);
      expect(joinResult.rows[0].post_title).toBe("Test Post");
      expect(joinResult.rows[0].comment_content).toBe("Test Comment");
    });
  });
});
