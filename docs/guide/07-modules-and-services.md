[Damat Guide](../GUIDE.md) › Modules & services

# 7. Modules & services

A module is the unit of composition (see [Concepts](./02-concepts.md)). It has
three small pieces.

## 7.1 The service

`ModuleService({ models, credentialsSchema })` returns a base class that
**auto-generates CRUD** for every model you register, keyed by the model's name.

```ts
// src/modules/user/service.ts
import { ModuleService } from "@damatjs/framework";
import { UserModel, AccountModel, SessionModel, VerificationModel } from "./models";
import { schema } from "./config/schema";

export const models = {
  user: UserModel,
  account: AccountModel,
  session: SessionModel,
  verification: VerificationModel,
};

export class UserModuleService extends ModuleService({
  models,
  credentialsSchema: schema,
}) {
  // Add domain methods on top of the generated CRUD:
  async findByEmail(email: string) {
    return this.user.find({ where: { email } });
  }

  async createWithAccount(email: string, provider: string) {
    return this.transaction(async () => {
      const user = await this.user.create({ data: { email } });
      await this.account.create({ data: { userId: user.id, provider } });
      return user;
    });
  }
}
```

Each registered model gets methods like `create`, `createMany`, `find`,
`findMany`, `update`, `delete`, `softDelete`, `restore`, `count`,
`exists`, plus `this.transaction(cb)`. Full list and options:
[`@damatjs/services` → module-service internals](../../packages/service/docs/module-service.md).

## 7.2 Credentials (config)

A module declares a zod schema for the config it needs and a loader that reads it
from the environment. This keeps secrets typed and validated at startup.

```ts
// src/modules/user/config/schema.ts
import { z } from "@damatjs/deps/zod";
export const schema = z.object({
  betterAuth: z.object({
    betterAuthSecret: z.string().min(32),
    sessionMaxAge: z.coerce.number().default(604800),
  }),
});

// src/modules/user/config/load.ts
export const load = (env: NodeJS.ProcessEnv) => ({
  betterAuth: {
    betterAuthSecret: env.BETTER_AUTH_SECRET,
    sessionMaxAge: env.SESSION_MAX_AGE,
  },
});
```

## 7.3 The module definition

```ts
// src/modules/user/index.ts
import { defineModule } from "@damatjs/framework";
import { UserModuleService, models } from "./service";
import credentials from "./config";   // { schema, load }

export const USER_MODULE = "user";
export { UserModuleService, models };

export default defineModule(USER_MODULE, {
  service: UserModuleService,
  credentials: credentials.load,
});
```

Register it in `damat.config.ts` (see [Configuration](./04-configuration.md)).
At runtime, get a module's service anywhere with `getModule`:

```ts
import { getModule } from "@damatjs/framework";
const users = getModule("user");
await users.user.create({ data: { email: "a@b.co" } });
```

> The same module can be **developed and tested in isolation** as a standalone
> package — see [Authoring a module](./13-authoring-modules.md).

---

Prev: [← Migrations](./06-migrations.md) · [Guide home](../GUIDE.md) · Next: [Building HTTP APIs →](./08-http-apis.md)
