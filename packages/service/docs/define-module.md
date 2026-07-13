# `defineModule` & module instances

Source: `src/module/define.ts`, `src/module/type.ts`.

## Responsibility

`defineModule` packages a service **class** plus a credentials loader into a `ModuleInstance` — the object a Damat app default-exports from its module folder and that `@damatjs/framework` discovers and registers. The instance's `.service` is a `Proxy` that constructs the real service **lazily** (on first property access) and binds it to whatever pool is current at that moment.

## Signature

```ts
export function defineModule<TService extends object>(
  name: string,
  definition: ModuleDefinition<TService>,
): ModuleInstance<TService>
```

```ts
interface ModuleDefinition<TService> {
  service: new (credentials: any) => TService;          // the service class (e.g. ModuleService subclass)
  credentials: (env: NodeJS.ProcessEnv) => any;          // loads credentials from env
}

interface ModuleInstance<TService> {
  readonly name: string;
  readonly service: TService;        // a Proxy (see below)
  readonly credentials: unknown;     // the parsed credentials object
  init(): TService;                  // (re)construct the service against the current pool
}
```

> Note: the `definition.credentials` passed to `defineModule` is a **function** `(env) => creds`. In the default backend, modules export `{ schema, load }` from their config and pass `credentials: credentials.load`. The separate `ModuleCredentials<TSchema>` interface in `type.ts` (`{ schema, load }`) documents that loader shape, though `defineModule` itself only invokes the function.

## Implementation walkthrough (`define.ts`)

```ts
export function defineModule<TService extends object>(name, definition) {
  let instance: TService | null = null;

  const parseCredentials = definition.credentials(process.env);  // eager: load creds now

  const init = () => {
    getLogger().debug("instance setup", { module: name });        // one debug line per (re)construction
    instance = new definition.service(parseCredentials);          // construct against CURRENT pool
    return instance;
  };

  const getService = (): TService => {
    if (!instance) init();
    return instance!;
  };

  const proxy = new Proxy({} as TService, {
    get(_, prop) {
      const svc = getService();
      const val = (svc as any)[prop];
      return typeof val === "function" ? val.bind(svc) : val;     // bind methods to the instance
    },
    set(_, prop, val) {
      (getService() as any)[prop] = val;
      return true;
    },
  });

  return { name, service: proxy, credentials: parseCredentials, init };
}
```

Key points:

1. **Credentials are parsed eagerly**, at `defineModule` call time, by invoking `definition.credentials(process.env)`. The result is exposed as `instance.credentials`.
2. **The service is constructed lazily**, on first access to any property of `proxy.service` (or explicitly via `init()`). This matters because the service's constructor requires `PoolManager` to already be initialized — deferring construction lets you `defineModule(...)` at import time, before the pool exists, and only construct once the framework has set up the pool.
3. **`init()` always constructs a fresh instance.** It is not memoized away. So calling `init()` after a `PoolManager.reset()` rebinds the service to the new pool/entity manager rather than reusing a stale one. The framework's `registerModule` calls `init()` exactly for this reason.
4. **Methods are bound.** The `get` trap binds functions to the underlying instance so `const { create } = module.service` style destructuring still works.

## How the framework uses it

`@damatjs/framework` (`services/moduleService.ts`):

```ts
export function registerModule(name: string, module: ModuleInstance<any>): void {
  module.init();                 // construct against the now-initialized pool
  moduleRegistry.set(name, module);
}
// getModule(name) returns moduleRegistry.get(name)?.service ?? null
```

`initModules` imports each module's **default export** and requires it to have an `init` function (i.e. be the result of `defineModule`), otherwise it throws.

A module folder's `index.ts` looks like:

```ts
import { defineModule } from "@damatjs/framework";   // re-exported from @damatjs/services
import { UserModuleService } from "./service";
import credentials from "./config";                  // { schema, load }

export default defineModule("user", {
  service: UserModuleService,
  credentials: credentials.load,
});
```

## `ModuleRegistry` — the typing seam

```ts
// src/module/type.ts
export interface ModuleRegistry {
  // Projects extend this via declaration merging
}
```

Empty by design. Apps augment it so the framework's `getModule("user")` is typed:

```ts
declare module "@damatjs/services" {
  interface ModuleRegistry {
    user: UserModuleService;
  }
}
// now: const users = getModule("user");  // UserModuleService | null
```

Without augmentation, pass the type explicitly: `getModule<UserModuleService>("user")`.

## Gotchas

- **Eager credentials, lazy service.** If `definition.credentials(process.env)` throws (e.g. a zod loader that validates), it throws at `defineModule` time / import time — not at first use. Keep the loader pure and defensive.
- **First property access constructs the service.** Merely *reading* a property (even a getter like `service.credentials` in tests) triggers construction, which requires `PoolManager.isInitialized()`. Don't touch the proxy before the pool is up unless you intend to construct.
- **`init()` is re-entrant by design.** Calling it again replaces the instance. This is intentional for test/harness reboots; it is also why the framework calls `init()` in `registerModule`.
- **The default export must be the `defineModule` result.** `initModules` checks for `typeof moduleInstance.init === "function"` and throws otherwise.
