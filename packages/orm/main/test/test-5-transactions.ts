// Test 5: Transactions
import { Pool } from "@damatjs/deps/pg";
import { model, columns } from "@damatjs/orm-model";
import { PgModelClient } from "@damatjs/orm-pg";

export async function test5_Transactions(pool: Pool) {
  await pool.query("SET search_path TO orm_test");

  const UserSchema = model("user", {
    id: columns.text().primaryKey(),
    email: columns.varchar().length(255).unique(),
    name: columns.text().nullable(),
  });

  const client = new PgModelClient(UserSchema, pool);

  // Commit
  await client.transaction(async (tx) => {
    await tx.create({ data: { id: "tx1", email: "tx1@test.com", name: "TX1" } });
    await tx.create({ data: { id: "tx2", email: "tx2@test.com", name: "TX2" } });
  });

  const checkTx = await client.findOne({ where: { id: "tx1" } });
  if (checkTx.rows.length !== 1) throw new Error("Transaction commit failed");
  console.log("✅ Transaction: commit works");

  // Rollback
  try {
    await client.transaction(async (tx) => {
      await tx.create({ data: { id: "rb", email: "rb@test.com", name: "RB" } });
      throw new Error("Intentional error");
    });
  } catch { }

  const checkRollback = await client.findOne({ where: { id: "rb" } });
  if (checkRollback.rows.length !== 0) throw new Error("Rollback failed");
  console.log("✅ Transaction: rollback works");
}
