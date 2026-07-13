// Test 2: Migration SQL Generation
import { model, columns, toModuleSchema } from "@damatjs/orm-model";
import { generateMigration } from "@damatjs/orm-processor";

export async function test2_MigrationSQL() {
  const UserSchema = model("user", {
    id: columns.text().primaryKey(),
    email: columns.varchar().length(255).unique(),
    name: columns.text().nullable(),
  });

  const moduleSchema = toModuleSchema("test", [UserSchema]);
  const migration = generateMigration.generateFromSnapshot(moduleSchema);

  console.log("✅ Migration SQL generated:");
  migration.upStatements.forEach((sql, i) => {
    console.log(`   ${i + 1}. ${sql.substring(0, 80)}...`);
  });

  return migration.upStatements;
}
