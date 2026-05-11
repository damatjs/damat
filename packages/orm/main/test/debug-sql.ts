/**
 * Debug Migration SQL
 */

import { model, columns, toModuleSchema } from "@damatjs/orm-model";
import { generateMigration } from '@damatjs/orm-processor';

const UserSchema = model("user", {
  id: columns.text().primaryKey(),
  email: columns.varchar().length(255).unique(),
  name: columns.text().nullable(),
});

const blogModule = toModuleSchema("blog", [UserSchema]);

console.log("Module Schema:", JSON.stringify(blogModule.tables[0], null, 2));

const migration = generateMigration.generateFromSnapshot(blogModule);

console.log("\nGenerated SQL:");
migration.upStatements.forEach((stmt, i) => {
  console.log(`\n${i + 1}. ${stmt}`);
});
