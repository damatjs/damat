# Module config (`module.config.ts`)

Source: `src/config/types.ts`, `src/config/define.ts`, `src/config/load.ts`.

`module.config.ts` is the **only** thing a module author has to configure for the
standalone runtime. Everything else — server, database wiring, migrations, tests —
is provided by the module runtime with sane defaults. The file is optional; an
absent config means "use all defaults".

## `ModuleAppConfig`

```ts
interface ModuleAppConfig {
  // Overrides merged over the runtime's standalone defaults (port, logger, etc).
  // Database/redis come from DATABASE_URL / REDIS_URL.
  projectConfig?: Omit<Partial<ProjectConfig>, "http"> & {
    http?: Partial<HttpConfig>;
  };
}
```

`ProjectConfig` / `HttpConfig` come from `@damatjs/framework`. The shape lets you
override any project-level field _except_ you provide `http` as a partial so you
can set, e.g., just the port without restating the whole HTTP config.

## `defineModuleConfig`

```ts
function defineModuleConfig(config: ModuleAppConfig): ModuleAppConfig {
  return config;
}
```

An identity helper purely for type-safety and editor completion. Use it as the
default export of `module.config.ts`:

```ts
// module.config.ts
import { defineModuleConfig } from "@damatjs/module";

export default defineModuleConfig({
  projectConfig: {
    http: { port: 8080 },
    loggerConfig: { level: "info" },
  },
});
```

## `loadModuleConfig`

```ts
async function loadModuleConfig(packageDir: string): Promise<ModuleAppConfig>;
```

Used by the runtime (`startModuleApp`) to read the author's config:

1. Look for `module.config.ts` then `module.config.js` in `packageDir`.
2. For the first that exists, dynamic-`import()` it (via `pathToFileURL`).
3. Take `exports.default ?? exports.config`.
4. If it isn't an object → throw
   `"<file> must default-export defineModuleConfig({...})"`.
5. If **no** config file exists → return `{}` (runtime defaults cover everything).

## How it feeds the runtime

`buildModuleAppConfig` (see [runtime.md](./runtime.md)) takes the loaded
`ModuleAppConfig` and layers it over the standalone defaults:

```
defaults  →  overrides = moduleConfig.projectConfig ?? {}
projectConfig = { ...defaults, ...overrides, http: { ...defaultHttp, ...overrides.http, port: resolvedPort } }
```

So `module.config.ts` only needs to specify what differs from the defaults.

## Gotchas

- The config is read from the **package root** (`packageDir`), not the module
  source dir (`src/`). The runtime resolves them separately.
- Prefer `DATABASE_URL` / `REDIS_URL` for connection settings. PostgreSQL is
  included only for a database-backed runtime plan; service-only modules ignore
  a stray `DATABASE_URL`.
- `LOG_LEVEL` supplies the default logger level. A `loggerConfig` override wins.
- Port precedence (highest first): `startModuleApp({ port })` → `PORT` env →
  `module.config.ts` `http.port` → `DEFAULT_MODULE_PORT` (7654). See
  [runtime.md](./runtime.md).
- `loadModuleConfig` swallowing a missing file (returning `{}`) is intentional —
  do not treat the absence of `module.config.ts` as an error.
