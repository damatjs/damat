# Migration Generator

A comprehensive migration generator that supports automatic schema diffing, SQL generation, and intelligent migration creation for MikroORM entities.

## Overview

The migration generator provides three modes of operation:

1. **Empty Template** - Creates a blank migration file for manual SQL writing
2. **Diff-Based** - Automatically detects schema changes and generates SQL
3. **Initial Migration** - Creates a full table creation migration for new modules

## Quick Start

```typescript
import {
  createMigration,
  createDiffMigration,
  createInitialMigration,
  previewDiffMigration,
} from "@damatjs/utils";

// 1. Create an empty migration (manual SQL)
const filePath = createMigration("./src/modules", "user", "AddPhoneColumn");

// 2. Create a diff-based migration (automatic SQL)
const result = createDiffMigration(
  "./src/modules",
  "user",
  "AddPhoneColumn",
  [User, UserProfile], // Your entity classes
  orm, // MikroORM instance
);

// 3. Create an initial migration (all tables)
const initialPath = createInitialMigration(
  "./src/modules",
  "user",
  [User, UserProfile],
  orm,
);

// 4. Preview changes without creating a file
const preview = previewDiffMigration("./src/modules", "user", entities, orm);
console.log(preview.diff.changes);
console.log(preview.migration.upStatements);
```

## Architecture

```
generator/
├── index.ts          # Main API exports
├── types.ts          # Type definitions
├── introspection.ts  # Entity schema extraction
├── diff.ts           # Schema comparison
├── sqlGenerator.ts   # SQL statement generation
├── template.ts       # Migration file templates
└── generateTimestamp.ts
```

## How It Works

### 1. Schema Introspection

The generator extracts schema information from MikroORM entity metadata:

```typescript
@Entity({ tableName: "users" })
class User {
  @PrimaryKey()
  id: string = uuid();

  @Property({ length: 255 })
  @Index()
  email!: string;

  @Property({ nullable: true })
  phone?: string;

  @ManyToOne(() => Team)
  team!: Team;
}
```

This is converted to a `TableSchema`:

```typescript
{
  name: 'users',
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, nullable: false },
    { name: 'email', type: 'varchar', length: 255, nullable: false },
    { name: 'phone', type: 'text', nullable: true },
    { name: 'team_id', type: 'uuid', nullable: false },
  ],
  indexes: [
    { name: 'idx_users_email', columns: ['email'], unique: false }
  ],
  foreignKeys: [
    { name: 'fk_users_team_id', columns: ['team_id'], referencedTable: 'teams', ... }
  ],
  primaryKey: ['id']
}
```

### 2. Schema Snapshots

The generator maintains a `.schema-snapshot.json` file in each module's migrations directory. This stores the last known schema state for comparison.

```
modules/user/migrations/
├── .schema-snapshot.json    # Current schema state
├── Migration20260211_Initial.ts
└── Migration20260212_AddPhone.ts
```

### 3. Schema Diffing

When creating a diff migration, the generator compares:

- Current entity definitions (from MikroORM metadata)
- Previous schema snapshot (from `.schema-snapshot.json`)

Detected changes include:

| Change Type        | Description                               |
| ------------------ | ----------------------------------------- |
| `create_table`     | New table added                           |
| `drop_table`       | Table removed                             |
| `add_column`       | New column added to existing table        |
| `drop_column`      | Column removed from table                 |
| `alter_column`     | Column type, nullable, or default changed |
| `rename_column`    | Column renamed                            |
| `add_index`        | New index created                         |
| `drop_index`       | Index removed                             |
| `add_foreign_key`  | New FK constraint                         |
| `drop_foreign_key` | FK constraint removed                     |
| `create_enum`      | New PostgreSQL enum type                  |
| `alter_enum`       | Enum values added                         |
| `drop_enum`        | Enum type removed                         |

### 4. SQL Generation

Changes are converted to PostgreSQL SQL statements:

```typescript
// Adding a column
ALTER TABLE "public"."users" ADD COLUMN "phone" VARCHAR(20) NULL

// Creating an index
CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "public"."users" ("phone")

// Adding a foreign key
ALTER TABLE "public"."users" ADD CONSTRAINT "fk_users_team_id"
  FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE CASCADE
```

### 5. Migration Template

The generated migration file includes both UP and DOWN migrations:

```typescript
import { Migration } from "@mikro-orm/migrations";

/**
 * Migration: AddPhoneColumn
 * Module: user
 * Created: 2026-02-11T12:34:56.000Z
 *
 * 1 column(s) added, 1 index(es) added
 */
export class Migration20260211123456_AddPhoneColumn extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'ALTER TABLE "public"."users" ADD COLUMN "phone" VARCHAR(20) NULL',
    );
    this.addSql(
      'CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "public"."users" ("phone")',
    );
  }

  async down(): Promise<void> {
    this.addSql('DROP INDEX IF EXISTS "public"."idx_users_phone"');
    this.addSql('ALTER TABLE "public"."users" DROP COLUMN IF EXISTS "phone"');
  }
}
```

## API Reference

### `createMigration(modulesDir, moduleName, name)`

Creates an empty migration template for manual SQL writing.

```typescript
const filePath = createMigration("./src/modules", "user", "CustomChange");
// Creates: ./src/modules/user/migrations/Migration20260211_CustomChange.ts
```

### `createDiffMigration(modulesDir, moduleName, name, entities, orm, options?)`

Creates a migration based on schema differences.

```typescript
const result = createDiffMigration(
  "./src/modules",
  "user",
  "AddFields",
  [User, UserProfile],
  orm,
  {
    generateDown: true, // Generate DOWN migration (default: true)
    cascadeDrops: false, // Add CASCADE to drops (default: false)
    safeMode: true, // Use IF EXISTS/IF NOT EXISTS (default: true)
    updateSnapshot: true, // Update schema snapshot (default: true)
    force: false, // Create even if no changes (default: false)
  },
);

if (result.hasChanges) {
  console.log(`Created: ${result.filePath}`);
  console.log(`Changes: ${result.diff.changes.length}`);
} else {
  console.log("No changes detected");
}
```

**Returns:**

```typescript
interface DiffMigrationResult {
  filePath: string | null; // Path to created file (null if no changes)
  hasChanges: boolean; // Whether changes were detected
  diff: SchemaDiff; // The schema diff
  migration: GeneratedMigration | null;
  warnings: string[]; // Warnings (e.g., potential data loss)
}
```

### `createInitialMigration(modulesDir, moduleName, entities, orm, options?)`

Creates a migration that creates all tables for a module.

```typescript
const filePath = createInitialMigration(
  "./src/modules",
  "billing",
  [Invoice, Payment, Subscription],
  orm,
);
```

### `previewDiffMigration(modulesDir, moduleName, entities, orm)`

Preview what changes would be detected without creating a file.

```typescript
const preview = previewDiffMigration("./src/modules", "user", entities, orm);

// Inspect changes
for (const change of preview.diff.changes) {
  console.log(`${change.type}: ${change.tableName}`);
}

// View generated SQL
console.log("UP:", preview.migration.upStatements);
console.log("DOWN:", preview.migration.downStatements);
```

### `updateSchemaSnapshot(modulesDir, moduleName, entities, orm)`

Update the schema snapshot without creating a migration. Useful for syncing after manual changes.

```typescript
updateSchemaSnapshot("./src/modules", "user", [User, UserProfile], orm);
```

### `getSchemaSnapshot(modulesDir, moduleName)`

Retrieve the stored schema snapshot.

```typescript
const snapshot = getSchemaSnapshot("./src/modules", "user");
console.log(snapshot.tables);
console.log(snapshot.enums);
```

## Supported Column Types

| MikroORM Type     | PostgreSQL Type        |
| ----------------- | ---------------------- |
| `string`          | `TEXT` or `VARCHAR(n)` |
| `number`          | `INTEGER`              |
| `bigint`          | `BIGINT`               |
| `boolean`         | `BOOLEAN`              |
| `Date`            | `TIMESTAMPTZ`          |
| `object` / `json` | `JSONB`                |
| `uuid`            | `UUID`                 |
| Enum              | Custom PostgreSQL ENUM |

## Warnings and Data Safety

The generator provides warnings for potentially dangerous operations:

- **Dropping columns**: "Dropping non-nullable column 'x' may cause data loss"
- **Dropping tables**: "Dropping table 'x' will delete all data"
- **Removing enum values**: "Removing values from enum is not directly supported"

Always review generated migrations before running in production!

## Best Practices

1. **Always review generated SQL** - Auto-generated migrations should be reviewed before execution

2. **Use preview first** - Use `previewDiffMigration()` to see changes before creating files

3. **Commit snapshots** - Include `.schema-snapshot.json` in version control

4. **One change per migration** - Prefer smaller, focused migrations over large ones

5. **Test down migrations** - Verify that DOWN migrations correctly reverse changes

6. **Handle data migrations separately** - For data transformations, create manual migrations

## Limitations

- **Enum value removal**: PostgreSQL doesn't support removing enum values directly. The generator will warn you about this.

- **Complex type changes**: Some type conversions may require manual USING clauses

- **Rename detection**: Column/table renames are detected as drop + add. Use manual migrations for renames.

- **Partial indexes**: Supported in schema but requires manual WHERE clause specification

## File Structure

After using the generator, your module structure will look like:

```
modules/
└── user/
    ├── models/
    │   ├── user.ts
    │   └── userProfile.ts
    └── migrations/
        ├── .schema-snapshot.json
        ├── Migration20260211000001_Initial.ts
        ├── Migration20260212123456_AddPhoneColumn.ts
        └── Migration20260213094521_AddUserSettings.ts
```
