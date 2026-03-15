# DAL Module - Database Model & Connection Layer

Provides database configuration, connection management, and module-based entity definitions using MikroORM. This documentation is for `@damatjs/orm-model`.

## Directory Structure

```
src/
├── index.ts         # Main entry point - exports all DAL APIs
├── transform/       # Entity transformation & fluent model builders
├── config/          # ORM configuration factories and utilities
├── connection/      # Connection management (singleton + factory)
├── types/           # Type definitions (Module, DB config, ORM config, connection)
└── DAL.md           # This documentation
```

## Key Concepts

### 1. Model Definitions & Schema Transformers

The primary role of `@damatjs/orm-model` is to provide a fluent API for defining database entities (`model.define`). This "transformer" pattern (similar to `@medusajs/framework/utils`) lets you define models using powerful column builders and relationships without relying completely on raw classes and decorators.

```typescript
import { model } from "@damatjs/orm-model/transform";

export const User = model.define("users", {
  id: model.id().primaryKey(),
  email: model.varchar(255).unique(),
  verified: model.boolean().default(false),
  metadata: model.json({ binary: true }).nullable(),
}).indexes([
  { name: "idx_users_email", columns: ["email"] }
]);

// Transform to TableSchema representations for runtime engines
const tableSchema = User.toTableSchema();
```

### 2. Database Modules

Instead of configuring all entities globally, the application is divided into feature modules. Each module registers its transformed entities and optionally a migrations path:

```typescript
import { DatabaseModule } from "@damatjs/orm-model";
import { User, Account, Session } from "./entities";

export const userModule: DatabaseModule = {
  name: "user",
  entities: [User, Account, Session],
  migrationsPath: "./migrations", // Used by @damatjs/orm-migration
};
```

### 3. Dependency Injection

While a singleton pattern is provided for convenience, you can also inject the raw MikroORM instance or standard components anywhere without relying on globals:

- ORM config is passed directly to `createConnection()`
- `EntityManager` can be forked (`connection.fork()`) per request to avoid global context issues

---

## Schema Builder API (Transformer)

The central class exposed is `model`, representing a wide variety of type definitions, schema options, and relations.

### Defining Models

```typescript
const MyModel = model.define('postgres_table_name', {
  id: model.id().primaryKey(),
  // columns
}, { schema: 'custom_pg_schema' }); // Optional schema context
```

### Column Types

- `model.id({ prefix: 'uid' })`: Text primary key (evaluates defaults like `generate_id('uid')`)
- `model.text()`: Standard text.
- `model.varchar(length)`: Variable string.
- `model.number()`: Integer numbers.
- `model.decimal(precision, scale)`: Decimal/Numeric types.
- `model.boolean()`: True/false values.
- `model.timestamp({ withTimezone: true })`: Timestamp types.
- `model.date()`, `model.time()`: Date and time variants.
- `model.json({ binary: true })`: JSON/JSONB objects.
- `model.enum(['active', 'draft'])`: Enum structures.
- `model.uuid()`: Standard UUID fields.
- `model.bytea()`: Binary data structures.

### Relationships

Relationships map to Foreign Keys inherently during transformation.

```typescript
// BelongsTo adds a foreign key column and constraint on your model
model.belongsTo(() => Category, { onDelete: 'SET NULL' })

// Inverse relationships (purely metadata, does not add columns automatically)
model.hasMany(() => OrderItem, { mappedBy: 'order_id' })
model.hasOne(() => Profile, { mappedBy: 'user_id' })
```

### Constraints & Modifiers

Builders can be chained:

```typescript
model.varchar().nullable()
model.text().unique()
model.integer().default(0)
```

---

## API Reference

### Configuration

#### `createOrmConfig(config: OrmConfig): Options`

Create MikroORM configuration from a structured config object that supports modules.

```typescript
import { createOrmConfig } from "@damatjs/orm-model";

const config = createOrmConfig({
  database: {
    url: process.env.DATABASE_URL,
    debug: process.env.NODE_ENV === "development",
    poolMin: 2,
    poolMax: 10,
  },
  modules: [
    { name: "user", entities: [User, Account] },
    { name: "billing", entities: [Invoice, Subscription] }
  ],
  options: {
    // Additional MikroORM options
  },
});
```

#### `createSimpleOrmConfig(databaseUrl, entities, extraOptions): Options`

Simplified API for quick configuration without explicit module definitions.

```typescript
import { createSimpleOrmConfig } from "@damatjs/orm-model";

const config = createSimpleOrmConfig(
  process.env.DATABASE_URL,
  [User, Team, Project],
  { debug: true }
);
```

---

### Connection Management

#### `createConnection(config: OrmConfig): Promise<DatabaseConnection>`

Create a new database connection instance. This does not set the global singleton.

```typescript
import { createConnection } from "@damatjs/orm-model";

const connection = await createConnection({
  database: { url: process.env.DATABASE_URL },
  modules: [{ name: "default", entities: [User, Team] }],
});

// Use the connection
const users = await connection.em.find(User, {});

// Close when done
await connection.close();
```

#### Singleton Pattern

For applications that prefer a global connection instance:

```typescript
import {
  initConnection,
  getConnection,
  closeConnection,
} from "@damatjs/orm-model";

// Initialize once at startup
await initConnection({
  database: { url: process.env.DATABASE_URL },
  modules: [userModule, billingModule],
});

// Use anywhere in your app
const connection = getConnection();

// IMPORTANT: Always fork the entity manager for isolation (e.g. per request)
const em = connection.fork();
const users = await em.find(User, {});

// Close on shutdown
await closeConnection();
```

#### Connection Health

```typescript
import { isConnectionHealthy } from "@damatjs/orm-model";

const healthy = await isConnectionHealthy(connection);
```

---

## Types

### DatabaseConfig

```typescript
interface DatabaseConfig {
  url: string; // PostgreSQL connection URL
  dbName?: string; // Extracted from URL if not provided
  debug?: boolean; // Enable debug logging (default: false in prod)
  poolMin?: number; // Connection pool min (default: 2)
  poolMax?: number; // Connection pool max (default: 10)
  allowGlobalContext?: boolean; // Allow global EM (default: true)
}
```

### DatabaseModule

```typescript
interface DatabaseModule {
  name: string;
  entities: EntityClass<any>[];
  migrationsPath?: string;
}
```

### OrmConfig

```typescript
interface OrmConfig {
  database: DatabaseConfig;
  modules: DatabaseModule[];
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
  fork: () => EntityManager;
}
```

---

## Migrations

Migration configuration and tracking has been moved out of the `@damatjs/orm-model` package.
Please see the `@damatjs/orm-migration` package for the newly specialized module migrations features.

---

## Dependencies

- `@damatjs/deps` - Provided dependencies for MikroORM (PostgreSQL, reflection, core) 
- `@damatjs/types` - Shared type definitions
