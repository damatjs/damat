# Link Module

Defines relationships between modules without coupling them. Links create junction tables and handle many-to-many or one-to-many relationships between separate modules.

## Directory Structure

```
link/
├── types.ts      # Type definitions (LinkRelationship, LinkEndpoint, etc.)
├── container.ts  # LinkContainer class for managing links
├── helpers.ts    # defineLink() and generateJunctionTableSQL()
├── index.ts      # Re-exports all public APIs
└── LINK.md       # This documentation
```

## Usage

### Defining a Link

```typescript
import { defineLink } from "@damatjs/service";
import { User } from "./user/entities";
import { Team } from "./team/entities";

// Many-to-many relationship between users and teams
const userTeamLink = defineLink({
  name: "user_team",
  from: {
    module: "user",
    entity: User,
    field: "teams",
    required: false,
  },
  to: {
    module: "team",
    entity: Team,
    field: "members",
    required: false,
  },
  relationship: "many-to-many",
  onDelete: "cascade",
});
```

### Using the Link Container

```typescript
import { LinkContainer } from "@damatjs/service";

const linkContainer = new LinkContainer();

// Register a link
const loadedLink = linkContainer.register(userTeamLink);
console.log(loadedLink.tableName); // "user_team_link" (for many-to-many)

// Get a link by name
const link = linkContainer.get("user_team");

// Get all links involving a module
const userLinks = linkContainer.getByModule("user");

// Check affected links before removing a module
const affected = linkContainer.getAffectedLinks("user");
if (affected.length > 0) {
  console.log("Warning: removing user module affects:", affected);
}

// Unregister a link
linkContainer.unregister("user_team");
```

### Generating Junction Table SQL

```typescript
import { generateJunctionTableSQL } from "@damatjs/service";

const { up, down } = generateJunctionTableSQL(userTeamLink);

// up contains CREATE TABLE statement
// down contains DROP TABLE statement
```

## Types

### LinkRelationship

```typescript
type LinkRelationship =
  | "one-to-one"
  | "one-to-many"
  | "many-to-one"
  | "many-to-many";
```

### LinkEndpoint

| Property   | Type               | Required | Description                     |
| ---------- | ------------------ | -------- | ------------------------------- |
| `module`   | `string`           | Yes      | Module name                     |
| `entity`   | `EntityClass<any>` | Yes      | Entity class                    |
| `field`    | `string`           | Yes      | Field name for the relationship |
| `required` | `boolean`          | No       | Whether this side is required   |

### LinkDefinition

| Property       | Type                                    | Required | Default     | Description          |
| -------------- | --------------------------------------- | -------- | ----------- | -------------------- |
| `name`         | `string`                                | Yes      | -           | Unique link name     |
| `from`         | `LinkEndpoint`                          | Yes      | -           | Source module/entity |
| `to`           | `LinkEndpoint`                          | Yes      | -           | Target module/entity |
| `relationship` | `LinkRelationship`                      | Yes      | -           | Type of relationship |
| `onDelete`     | `"cascade" \| "set null" \| "restrict"` | No       | `"cascade"` | Delete behavior      |
| `metadata`     | `Record<string, any>`                   | No       | -           | Additional metadata  |

### LoadedLink

| Property     | Type                  | Description                             |
| ------------ | --------------------- | --------------------------------------- |
| `definition` | `LinkDefinition`      | The original link definition            |
| `tableName`  | `string \| undefined` | Junction table name (many-to-many only) |

## Junction Table Structure

For many-to-many relationships, the generated junction table includes:

```sql
CREATE TABLE IF NOT EXISTS "user_team_link" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "metadata" JSONB DEFAULT '{}',
    UNIQUE("user_id", "team_id")
);
```

Indexes are automatically created for both foreign key columns.
