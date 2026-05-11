// Test 6: UPSERT
import { Pool } from "@damatjs/deps/pg";
import { model, columns } from "@damatjs/orm-model";
import { PgModelClient } from "@damatjs/orm-pg";

export async function test6_Upsert(pool: Pool) {
  await pool.query("SET search_path TO orm_test");

  const UserSchema = model("user", {
    id: columns.text().primaryKey(),
    email: columns.varchar().length(255).unique(),
    name: columns.text().nullable(),
    verified: columns.boolean().default(false),
  });

  const client = new PgModelClient(UserSchema, pool);

  // Insert on conflict
  const inserted = await client.upsert({
    data: { id: "up1", email: "upsert@test.com", name: "Upsert User" },
    onConflict: ["email"],
    updateColumns: ["name"],
    returning: ["id", "email", "name"],
  });
  console.log("✅ UPSERT insert:", inserted.rows[0].email);

  // Update on conflict
  const updated = await client.upsert({
    data: { id: "up2", email: "upsert@test.com", name: "Updated Name" },
    onConflict: ["email"],
    updateColumns: ["name"],
    returning: ["id", "email", "name"],
  });
  console.log("✅ UPSERT update:", updated.rows[0].name);
}
