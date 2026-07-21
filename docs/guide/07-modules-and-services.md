[Damat Guide](../GUIDE.md) › Modules & services

# 7. Modules & services

A module owns one domain slice: models, migrations, typed configuration, a
service, and optional routes or orchestration providers. The backend decides
which modules to assemble and supplies their shared infrastructure.

## 7.1 Models become service accessors

Collect the module's ORM models, then pass them to `ModuleService`:

```ts
import { ModuleService } from "@damatjs/services";
import { collectModels, columns, model } from "@damatjs/orm-model";

const User = model("users", {
  id: columns.id({ prefix: "usr" }).primaryKey(),
  email: columns.text().unique(),
}).timestamps();

export const models = collectModels([User]);
export class UserService extends ModuleService({ models }) {}
```

The table name determines the camel-cased accessor. `users` becomes
`service.users`, with create, find, update, delete, upsert, count, relation, and
transaction operations. Do not add methods that merely rename those accessors.

## 7.2 Layer business behavior

The normal request path is:

```text
route → workflow → step → service accessor or integration
```

- Routes validate input, call a workflow, and shape the HTTP response.
- Workflows express local saga order, retry, and compensation.
- Steps perform one meaningful action and own its compensation.
- Services provide generated model accessors and genuinely new integrations.

A step can call the typed module registry directly:

```ts
import { getModule } from "@damatjs/framework";

const users = getModule("user");
const user = await users.users.create({ data: { email: input.email } });
```

Keep provider-specific SDK work in small `src/lib/<provider>.ts` files and
expose it through a service method. Multi-stage, restartable orchestration is a
pipeline; background work is a job; delivery to durable subscribers is an
event. See [Durable events and jobs](./10b-events-and-jobs.md) and
[Pipelines](./10c-pipelines.md).

## 7.3 Typed credentials

Declare the module's configuration schema and load values from the environment:

```ts
import { z } from "@damatjs/deps/zod";

export const schema = z.object({ apiKey: z.string().min(16) });
export const load = (env: NodeJS.ProcessEnv) => ({
  apiKey: env.PROVIDER_API_KEY,
});
```

Register required environment names in the module's `damat.json`. Installers
report them, but the backend owner decides where secrets are stored.

## 7.4 Define and register the module

Portable module packages import definition APIs from `@damatjs/services`:

```ts
import { defineModule } from "@damatjs/services";
import credentials from "./config";
import { models, UserService } from "./service";

export { models, UserService };
export default defineModule("user", {
  service: UserService,
  credentials: credentials.load,
});
```

An app-owned module may use the curated `@damatjs/framework` surface described
in the root [AGENTS.md](../../AGENTS.md). Register the module under a stable key
in `damat.config.ts`; `getModule(key)` then returns its typed service.

## 7.5 Relate independent modules with links

One module never imports another module's internals or creates a cross-module
foreign key. The backend owns links under `src/links/`, migrates their junction
tables, and queries them through `getModule("link")`.

```ts
const link = getModule("link");
const { data } = await link.graph({
  module: "user",
  entity: "users",
  fields: ["*", "organizations.*"],
});
```

See the [`@damatjs/link` README](../../packages/link/README.md) for the complete
definition, migration, and graph-query flow.

---

Prev: [← Migrations](./06-migrations.md) · [Guide home](../GUIDE.md) · Next: [Querying & CRUD →](./07b-crud-reference.md)
