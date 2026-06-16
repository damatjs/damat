[Damat Guide](../GUIDE.md) › Defining models

# 5. Defining models (the ORM DSL)

Models are defined with a fluent, type-safe DSL from
[`@damatjs/orm-model`](../../packages/orm/model/README.md). `model(table, columns)`
returns a definition you can refine with `.indexes()`, `.constrain()`,
`.timestamps()`, and `.softDelete()`.

```ts
import { model, columns } from "@damatjs/orm-model";

export const UserModel = model("users", {
  id: columns.id({ prefix: "usr" }).primaryKey(),
  email: columns.text().unique(),
  emailVerified: columns.boolean().default(false),
  name: columns.text().nullable(),
  image: columns.text().nullable(),

  // relations reference the target table name
  accounts: columns.hasMany("accounts"),
  sessions: columns.hasMany("sessions"),
}).indexes([
  columns.indexes().columns(["email"]).unique(),
]);

export default UserModel;
```

## Columns

The DSL covers the PostgreSQL type system. Common builders:

| Group | Builders |
|-------|----------|
| Identity | `id({ prefix? })`, `uuid()` |
| Strings | `text()`, `varchar(length?)`, `char(length?)` |
| Numbers | `integer()`, `numeric(precision?, scale?)`, `real()`, `doublePrecision()`, `money()` |
| Boolean | `boolean()` |
| Temporal | `timestamp({ withTimezone? })`, `date()`, `time()`, `interval()` |
| JSON | `json()`, `jsonb()` |
| Binary | `bytea()` |
| Enum | `enum(values)` |
| Vector | `vector(dimensions)` — pgvector |
| Relations | `belongsTo(target)`, `hasMany(target)`, `hasOne(target)` |

Modifiers chain: `.primaryKey()`, `.unique()`, `.nullable()`,
`.default(value)`, `.defaultNow()`, `.length(n)`, `.name("col_name")`,
`.autoincrement()`. See the
[orm-model column reference](../../packages/orm/model/docs/README.md) for the
complete list and exact semantics.

## Relations, indexes, constraints

```ts
export const AccountModel = model("accounts", {
  id: columns.id({ prefix: "acc" }).primaryKey(),
  userId: columns.text(),
  provider: columns.text(),
  user: columns.belongsTo("users"),   // FK -> users
})
  .indexes([columns.indexes().columns(["userId"])])
  .timestamps();                       // adds createdAt / updatedAt
```

Cross-module relationships live in `src/links/` so modules stay decoupled — see
[Concepts → How modules compose](./02-concepts.md#how-modules-compose) and
[the default backend](./12-default-backend.md).

Once models change, generate and apply a [migration](./06-migrations.md).

---

Prev: [← Configuration & environment](./04-configuration.md) · [Guide home](../GUIDE.md) · Next: [Migrations →](./06-migrations.md)
