// Test schema from module
import { model, columns, toModuleSchema } from "@damatjs/orm-model";
import { generateMigration } from "@damatjs/orm-processor";

const UserSchema = model("user", {
  id: columns.text().primaryKey(),
  email: columns.text(),
});

// Test 1: Default schema
const module1 = toModuleSchema("app1", [UserSchema]);
const migration1 = generateMigration.generateFromSnapshot(module1);
console.log(
  "✅ Default schema:",
  migration1.upStatements[0].includes('"public"."user"') ? "public" : "unknown",
);

// Test 2: Custom schema in module
const module2 = toModuleSchema("app2", [UserSchema], {
  schema: "custom_schema",
});
const migration2 = generateMigration.generateFromSnapshot(module2);
console.log(
  "✅ Custom schema:",
  migration2.upStatements[0].includes('"custom_schema"."user"')
    ? "custom_schema"
    : "failed",
);

console.log("\nSQL 1:", migration1.upStatements[0].substring(0, 50));
console.log("SQL 2:", migration2.upStatements[0].substring(0, 50));
