// Test 4: PgModelClient CRUD
import { Pool } from "@damatjs/deps/pg";
import { model, columns } from "@damatjs/orm-model";
import { PgModelClient } from "@damatjs/orm-pg";

export async function test4_CrudOperations(pool: Pool) {
  await pool.query("SET search_path TO orm_test");

  const UserSchema = model("user", {
    id: columns.text().primaryKey(),
    email: columns.varchar().length(255).unique(),
    name: columns.text().nullable(),
  });

  const client = new PgModelClient(UserSchema, pool);

  // INSERT
  const inserted = await client.create({
    data: { id: "test1", email: "test@test.com", name: "Test User" },
    returning: ["id", "email"],
  });
  console.log("✅ INSERT:", inserted.rows[0].email);

  // SELECT
  const selected = await client.findMany({
    select: ["id", "email", "name"],
  });
  console.log("✅ SELECT:", selected.rows.length, "users");

  // UPDATE
  const updated = await client.update({
    set: { name: "Updated User" },
    where: { id: "test1" },
    returning: ["id", "name"],
  });
  console.log("✅ UPDATE:", updated.rows[0].name);

  // DELETE
  await client.create({
    data: { id: "temp", email: "temp@test.com", name: "Temp" },
  });
  const deleted = await client.delete({
    where: { id: "temp" },
    returning: ["id"],
  });
  console.log("✅ DELETE:", deleted.rows[0].id);
}
