# Modules

Utilities for defining self-contained modules following Medusa.js patterns. Each module is completely independent and can be added/removed without affecting other modules.

## Directory Structure

```
modules/
├── types.ts      # Type definitions (ModuleDefinition, ModuleInstance, ModuleCredentials)
├── helpers.ts    # defineModule() function
├── index.ts      # Re-exports all public APIs
└── MODULES.md    # This documentation
```

## Usage

### 1. Define Module Configuration (Optional)

You can define a strongly typed, validated configuration (credentials) using Zod.

```typescript
import { z } from "@damatjs/deps/zod";

export const schema = z.object({
  secretKey: z.string().min(10),
  apiUrl: z.string().url().optional(),
});

export const load = (env: NodeJS.ProcessEnv) => ({
  secretKey: env.MY_SECRET_KEY,
  apiUrl: env.MY_API_URL,
});

const credentials = { schema, load };
export default credentials;
```

### 2. Create the Module Service

Extend `ModuleService(...)` passing your MikroORM entities and the optional Zod schema to get fully automated CRUD services and fully typed credentials.

```typescript
import { ModuleService } from "@damatjs/services";
import { User, Session } from "./models";
import { schema } from "./config/schema";

class UserModuleService extends ModuleService({
  user: User,
  session: Session,
}, schema) {
  
  // You can now access full CRUD operations automatically:
  // this.user.create(...)
  // this.session.list(...)

  async customMethod() {
    // `this.credentials` is fully typed based on the schema!
    const key = this.credentials.secretKey;
    
    // Custom business logic...
    console.log(key);
  }
}

export default UserModuleService;
```

### 3. Expose the Module Definition

Use `defineModule` to create a new module. Types for both the service and the credentials will be inferred automatically — no explicit generic typing is required!

```typescript
import { defineModule } from "@damatjs/services";
import UserModuleService from "./service";
import credentials from "./config";

export const USER_MODULE = "user";

export const definition = defineModule(USER_MODULE, {
  service: UserModuleService,
  credentials,
  migrationsPath: "./migrations",
});

export default definition;
```

### 4. Initialize the Module

Once defined, you must initialize the module with your EntityManager factory before you can use the service.

```typescript
import userModuleDefinition from "./modules/user";

// Provide a factory function that returns an EntityManager
userModuleDefinition.init(() => orm.em);

// Now the service methods are available and configuration is loaded and validated!
const user = await userModuleDefinition.service.user.findOne({ id: "123" });
```

## Types

### ModuleDefinition

| Property | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `service` | `new (em, credentials) => TService` | Yes | - | Service class constructor |
| `credentials` | `ModuleCredentials<TSchema>` | No | - | Schema and load function for config |
| `migrationsPath` | `string` | No | `"./migrations"` | Path to migrations |

### ModuleCredentials

| Property | Type | Description |
| --- | --- | --- |
| `schema` | `z.ZodObject<...>` | Zod schema to validate environment variables |
| `load` | `(env: NodeJS.ProcessEnv) => Record<string, unknown>` | Extracts values from raw environment vars |

### ModuleInstance

| Property | Type | Description |
| --- | --- | --- |
| `name` | `string` | The original module name |
| `service` | `TService` | Instantiated service Proxy |
| `migrationsPath` | `string` | Migrations directory |
| `init` | `(getEm: () => EntityManager) => void` | Initialization and validation function |

## Best Practices

1. **Keep modules independent**: Avoid direct imports between modules.
2. **Never type `<TService, TSchema>` explicitly**: Let TypeScript infer them from `defineModule(USER_MODULE, { ... })` and `ModuleService({ ... }, schema)`.
3. **Use Zod for config validation**: Take advantage of highly typed `this.credentials` within your service to centralize environment variable checks and fallbacks.
4. **Use `ModuleService` auto-generation**: Do not manually craft repositories unless necessary, `ModuleService({ ... })` exposes CRUD operations out-of-the-box.
