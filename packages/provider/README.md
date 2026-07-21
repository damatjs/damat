# @damatjs/provider

The provider authoring layer for Damat. A provider is an ordinary module whose
service follows an additional, repeatable contract. It uses the same models,
credentials, migrations, generated accessors, transactions, initialization,
and routes as every other module.

`ProviderService` extends `ModuleService` and adds a stable role marker:

```ts
import { ProviderService } from "@damatjs/provider";
import { models } from "./models";

abstract class EmailProviderService extends ProviderService({
  role: "email",
  models,
}) {
  abstract send(input: SendEmailInput): Promise<SendEmailResult>;
}
```

Provider-standard packages use that pattern to declare abstract operations.
Concrete modules implement the operations and fail TypeScript compilation when
a required method is missing. A plain `ModuleService` with the same structural
methods can also fill a provider role.

The backend initializes the module once and binds its existing service:

```ts
modules: {
  mail: { resolve: "./src/modules/mail" },
},
providers: {
  email: { module: "mail" },
}
```

The provider layer owns no factory context, database pool, routes, middleware,
health lifecycle, or shutdown lifecycle. Those remain normal module/framework
concerns.

## License

MIT
