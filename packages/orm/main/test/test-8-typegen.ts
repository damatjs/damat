// Test Type Generation with Real Database
import { Pool } from "@damatjs/deps/pg";
import {
  model,
  columns,
  toModuleSchema,
  generateTypes,
  EnumBuilder,
} from "@damatjs/orm-model";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const DB_URL =
  "postgres://postgres:Password@0.0.0.0:5432/testt?sslmode=disable";

async function testTypeGeneration() {
  console.log("=".repeat(80));
  console.log("TESTING TYPE GENERATION");
  console.log("=".repeat(80));

  const pool = new Pool({ connectionString: DB_URL });

  try {
    // 1. Define models with various types
    console.log("\n1. Defining models...");

    const ProductStatusEnumName = new EnumBuilder([
      "draft",
      "active",
      "archived",
    ]).name("product_status");

    const ProductStatusEnum = columns.enum(ProductStatusEnumName);

    const UserSchema = model("user", {
      id: columns.id({ prefix: "usr" }).primaryKey(),
      email: columns.varchar().length(255).unique(),
      name: columns.text().nullable(),
      age: columns.integer().nullable(),
      verified: columns.boolean().default(false),
      metadata: columns.json().nullable(),
      createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    }).indexes([
      columns.indexes("idx_users_email").columns(["email"]).unique(),
    ]);

    const PostSchema = model("post", {
      id: columns.id({ prefix: "pst" }).primaryKey(),
      title: columns.varchar().length(255),
      content: columns.text().nullable(),
      published: columns.boolean().default(false),
      authorId: columns.id({ prefix: "usr" }),
      createdAt: columns.timestamp({ withTimezone: true }).defaultNow(),
    }).indexes([columns.indexes("idx_posts_author").columns(["authorId"])]);

    console.log("   ✅ Models defined");

    // 2. Create module schema with enums
    console.log("\n2. Creating module schema...");
    const schema = toModuleSchema("blog", [UserSchema, PostSchema], {
      enums: [ProductStatusEnum],
    });
    console.log("   ✅ Module schema created");
    console.log(
      `   Tables: ${schema.tables.map((t: any) => t.name).join(", ")}`,
    );
    console.log(`   Enums: ${schema.enums.map((e: any) => e.name).join(", ")}`);

    // 3. Generate TypeScript types
    console.log("\n3. Generating TypeScript types...");
    const typeOutput = generateTypes(schema);

    // Check output contains expected elements
    if (!typeOutput.includes("export interface User")) {
      throw new Error("User interface not generated");
    }
    if (!typeOutput.includes("export interface Post")) {
      throw new Error("Post interface not generated");
    }
    if (!typeOutput.includes("export type ProductStatusEnum")) {
      throw new Error("Enum type not generated");
    }
    if (!typeOutput.includes("export type NewUser")) {
      throw new Error("NewUser type not generated");
    }
    if (!typeOutput.includes("export type UpdateUser")) {
      throw new Error("UpdateUser type not generated");
    }
    console.log("   ✅ Types generated successfully");

    // 4. Save generated types to file
    console.log("\n4. Saving generated types...");
    const outputDir = "/tmp/orm-typegen-test";
    mkdirSync(outputDir, { recursive: true });
    const outputPath = join(outputDir, "types.ts");
    writeFileSync(outputPath, typeOutput);
    console.log(`   ✅ Types saved to: ${outputPath}`);

    // 5. Show type examples
    console.log("\n5. Generated type examples:");
    const lines = typeOutput.split("\n");

    console.log("\n   --- ProductStatusEnum ---");
    const enumStart = lines.findIndex((l) =>
      l.includes("export type ProductStatusEnum"),
    );
    if (enumStart >= 0) {
      console.log("   " + lines.slice(enumStart, enumStart + 1).join("\n   "));
    }

    console.log("\n   --- User Interface ---");
    const userStart = lines.findIndex((l) =>
      l.includes("export interface User {"),
    );
    if (userStart >= 0) {
      console.log("   " + lines.slice(userStart, userStart + 12).join("\n   "));
    }

    console.log("\n   --- NewUser Type ---");
    const newUserStart = lines.findIndex((l) =>
      l.includes("export type NewUser ="),
    );
    if (newUserStart >= 0) {
      console.log(
        "   " + lines.slice(newUserStart, newUserStart + 6).join("\n   "),
      );
    }

    console.log("\n   --- UpdateUser Type ---");
    const updateUserStart = lines.findIndex((l) =>
      l.includes("export type UpdateUser ="),
    );
    if (updateUserStart >= 0) {
      console.log(
        "   " + lines.slice(updateUserStart, updateUserStart + 1).join("\n   "),
      );
    }

    // 6. Verify types match TypeScript expectations
    console.log("\n6. Verifying type correctness...");

    // Check for proper type mappings
    const typeChecks = [
      ["id: string;", "ID column"],
      ["email: string;", "Email column"],
      ["name: string | null;", "Nullable column"],
      ["age: number | null;", "Integer nullable"],
      ["verified: boolean;", "Boolean column"],
      ["metadata: unknown | null;", "JSON column"],
      ["createdAt: Date;", "Timestamp column"],
      ["authorId: string;", "Foreign key"],
    ];

    for (const [pattern, desc] of typeChecks) {
      if (!typeOutput.includes(pattern)) {
        throw new Error(`Type mapping failed: ${desc} (${pattern})`);
      }
    }
    console.log("   ✅ All type mappings correct");

    // 7. Verify New* types omit auto fields
    console.log("\n7. Verifying New* types...");
    const newUserType =
      typeOutput.match(/export type NewUser = \{[^}]+\}/s)?.[0] || "";

    if (newUserType.includes("id:")) {
      throw new Error("NewUser should not include 'id'");
    }
    if (newUserType.includes("createdAt:")) {
      throw new Error("NewUser should not include 'createdAt'");
    }

    // Should include email (required)
    if (!newUserType.includes("email:")) {
      throw new Error("NewUser should include 'email'");
    }

    console.log("   ✅ New* types correctly exclude auto fields");

    // 8. Verify Update* types
    console.log("\n8. Verifying Update* types...");
    if (
      !typeOutput.includes("export type UpdateUser = Partial<Omit<User, 'id'>>")
    ) {
      throw new Error("UpdateUser type incorrect");
    }
    console.log("   ✅ Update* types are correct");

    console.log("\n" + "=".repeat(80));
    console.log("✅ ALL TYPE GENERATION TESTS PASSED");
    console.log("=".repeat(80));
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

testTypeGeneration();
