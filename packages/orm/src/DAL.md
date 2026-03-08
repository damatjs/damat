# DAL Module - Database Access Layer

Provides database configuration, connection management, and module-based migration utilities using MikroORM.

## Directory Structure

```
dal/
├── index.ts         # Main entry point - exports all DAL APIs
├── types.ts         # Type definitions (DB config, ORM config, connection)
├── config.ts        # ORM configuration factory
├── connection.ts    # Connection management (singleton + factory)
├── migrations/      # Module migration system
│   ├── index.ts     # Migration exports
│   ├── types.ts     # Migration-specific types
│   ├── logger.ts    # Colored console output utilities
│   ├── discovery.ts # Migration file discovery
│   ├── generator.ts # Migration file creation
│   ├── tracker.ts   # Migration tracking table (MigrationTracker class)
│   ├── executor.ts  # Run, revert, status functions
│   └── cli/         # CLI implementation
│       ├── index.ts # Main runCli function
│       ├── help.ts  # Help text
│       └── commands.ts # Command handlers
└── DAL.md           # This documentation
```

## Key Concepts

### 1. Module-based Migrations

Unlike traditional single-folder migrations, this system supports **per-module migrations**. Each module in your application can have its own `migrations/` folder with UP/DOWN support.

```
src/modules/
├── user/
│   ├── migrations/
│   │   ├── Migration20260101_CreateUserTable.ts
│   │   └── Migration20260102_AddEmailColumn.ts
│   └── ...
├── billing/
│   ├── migrations/
│   │   └── Migration20260105_CreateInvoiceTable.ts
│   └── ...
```

### 2. Dependency Injection

All functions accept required dependencies as parameters rather than importing globals:

- ORM config is passed to `createConnection()`
- MikroORM instance is passed to migration functions
- No singletons required (though optional singleton pattern is available)

---

## API Reference

### Configuration

#### `createOrmConfig(config: OrmConfig): Options`

Create MikroORM configuration from structured config object.

```typescript
import { createOrmConfig } from "@damatjs/utils";

const config = createOrmConfig({
  database: {
    url: process.env.DATABASE_URL,
    debug: process.env.NODE_ENV === "development",
    poolMin: 2,
    poolMax: 10,
  },
  entities: [User, Team, Project],
  options: {
    // Additional MikroORM options
  },
});
```

#### `createSimpleOrmConfig(url, entities, options): Options`

Simplified API for quick configuration.

```typescript
import { createSimpleOrmConfig } from "@damatjs/utils";

const config = createSimpleOrmConfig(process.env.DATABASE_URL, [
  User,
  Team,
  Project,
]);
```

#### `createMikroOrmConfig(entities, options): Options` (Deprecated)

Legacy function - use `createSimpleOrmConfig` instead.

---

### Connection Management

#### `createConnection(config: OrmConfig): Promise<DatabaseConnection>`

Create a new database connection.

```typescript
import { createConnection } from "@damatjs/utils";

const connection = await createConnection({
  database: { url: process.env.DATABASE_URL },
  entities: [User, Team],
});

// Use the connection
const users = await connection.em.find(User, {});

// Close when done
await connection.close();
```

#### `createConnectionFromOptions(options: Options): Promise<DatabaseConnection>`

Create connection from raw MikroORM options.

```typescript
import { createConnectionFromOptions, createOrmConfig } from '@damatjs/utils';

const options = createOrmConfig({ ... });
const connection = await createConnectionFromOptions(options);
```

#### Singleton Pattern

For apps that need a global connection:

```typescript
import {
  initConnection,
  getConnection,
  closeConnection,
} from "@damatjs/utils";

// Initialize once at startup
await initConnection({
  database: { url: process.env.DATABASE_URL },
  entities: [User, Team],
});

// Use anywhere in your app
const connection = getConnection();
const users = await connection.em.find(User, {});

// Close on shutdown
await closeConnection();
```

#### `isConnectionHealthy(connection): Promise<boolean>`

Check if a connection is healthy.

```typescript
const healthy = await isConnectionHealthy(connection);
```

---

### Migrations

#### Discovery

```typescript
import {
  discoverModuleMigrations,
  discoverAllMigrations,
  listModulesWithMigrations,
} from "@damatjs/utils";

// Discover migrations for one module
const userMigrations = discoverModuleMigrations("./src/modules", "user");

// Discover all migrations across modules
const allMigrations = discoverAllMigrations("./src/modules", [
  "user",
  "billing",
  "notifications",
]);

// List modules that have migrations
const modules = listModulesWithMigrations("./src/modules", [
  "user",
  "billing",
  "notifications",
]);
```

#### Running Migrations

```typescript
import { MikroORM } from "@damatjs/deps/mikro-orm/postgresql";
import {
  runMigrations,
  revertMigrations,
  getMigrationStatus,
} from "@damatjs/utils";

const orm = await MikroORM.init(config);

// Run all pending migrations
const results = await runMigrations(orm, "./src/modules", ["user", "billing"]);

// Run migrations for a specific module
const userResults = await runMigrations(
  orm,
  "./src/modules",
  ["user"],
  "user", // specific module
);

// Revert last migration for a module
const revertResult = await revertMigrations(
  orm,
  "./src/modules",
  "user",
  1, // count to revert
);

// Get migration status
const status = await getMigrationStatus(orm, "./src/modules", [
  "user",
  "billing",
]);
```

#### Creating Migrations

```typescript
import { createMigration } from "@damatjs/utils";

// Creates: src/modules/user/migrations/Migration20260211_AddPhoneColumn.ts
const filePath = createMigration("./src/modules", "user", "AddPhoneColumn");
```

#### Migration Tracker

The `MigrationTracker` class manages the `_module_migrations` table:

```typescript
import { MigrationTracker } from "@damatjs/utils";

const tracker = new MigrationTracker(orm);
await tracker.ensureTable();

// Get applied migrations
const applied = await tracker.getApplied("user");

// Record a migration as applied
await tracker.recordApplied("user", "Migration20260211_Initial", 150);

// Record a migration as reverted
await tracker.recordReverted("user", "Migration20260211_Initial");
```

---

### CLI

Use `runCli()` to add migration commands to your project:

```typescript
// scripts/db-migrate.ts
import { runCli, createSimpleOrmConfig } from "@damatjs/utils";

const ormConfig = createSimpleOrmConfig(
  process.env.DATABASE_URL,
  [], // entities loaded dynamically
);

runCli({
  ormConfig,
  modulesDir: "./src/modules",
  activeModules: ["user", "billing", "notifications"],
});
```

**Commands:**

```bash
# Run all pending migrations
npm run db:migrate

# Show migration status
npm run db:migrate status

# Create a new migration
npm run db:migrate create user AddPhoneColumn

# Revert last migration for a module
npm run db:migrate revert user

# Revert last 3 migrations
npm run db:migrate revert user 3

# Revert all migrations for a module
npm run db:migrate revert user --all

# List modules with migrations
npm run db:migrate list
```

---

## Types

### DatabaseConfig

```typescript
interface DatabaseConfig {
  url: string; // PostgreSQL connection URL
  debug?: boolean; // Enable debug logging (default: false in prod)
  poolMin?: number; // Connection pool min (default: 2)
  poolMax?: number; // Connection pool max (default: 10)
  allowGlobalContext?: boolean; // Allow global EM (default: true)
}
```

### OrmConfig

```typescript
interface OrmConfig {
  database: DatabaseConfig;
  entities?: EntityClass<any>[];
  options?: Partial<Options>;
}
```

### DatabaseConnection

```typescript
interface DatabaseConnection {
  orm: MikroORM;
  em: EntityManager;
  close: () => Promise<void>;
  isConnected: () => Promise<boolean>;
}
```

### MigrationInfo

```typescript
interface MigrationInfo {
  name: string; // Migration class name
  module: string; // Module name
  path: string; // Full file path
  timestamp: number; // Extracted from filename
  applied: boolean; // Whether applied to DB
}
```

### ModuleMigrationResult

```typescript
interface ModuleMigrationResult {
  success: boolean;
  module: string;
  applied: string[]; // Applied migration names
  reverted: string[]; // Reverted migration names
  pending: string[]; // Pending migration names
  error?: Error;
}
```

---

## Writing Migrations

Migration files follow the MikroORM format:

```typescript
// src/modules/user/migrations/Migration20260211_AddPhoneColumn.ts
import { Migration } from "@mikro-orm/migrations";

export class Migration20260211_AddPhoneColumn extends Migration {
  async up(): Promise<void> {
    this.addSql('ALTER TABLE "user" ADD COLUMN "phone" VARCHAR(20)');
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "user" DROP COLUMN "phone"');
  }
}
```

**Naming Convention:** `Migration<TIMESTAMP>_<Name>.ts`

- Timestamp: `YYYYMMDDHHMMSS` format
- Name: PascalCase description

---

## Migration Tracking Table

The system creates a `_module_migrations` table to track applied migrations:

| Column            | Type        | Description                     |
| ----------------- | ----------- | ------------------------------- |
| id                | TEXT        | Primary key (`{module}_{name}`) |
| module            | TEXT        | Module name                     |
| name              | TEXT        | Migration class name            |
| applied_at        | TIMESTAMPTZ | When applied                    |
| reverted_at       | TIMESTAMPTZ | When reverted (if applicable)   |
| execution_time_ms | INTEGER     | Execution time                  |
| status            | TEXT        | 'applied' or 'reverted'         |

---

## Dependencies

- `@damatjs/deps/mikro-orm/postgresql` - MikroORM PostgreSQL driver
- `@damatjs/deps/mikro-orm/reflection` - TsMorphMetadataProvider
- `@damatjs/deps/mikro-orm/core` - Core MikroORM types
- `@damatjs/deps/mikro-orm/migrations` - Migration base class
