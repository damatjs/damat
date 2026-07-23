# Runtime — module as a live app

Source: `src/runtime/plan.ts`, `src/runtime/capabilities.ts`,
`src/runtime/migrations.ts`, `src/runtime/start.ts`, `src/runtime/server.ts`,
`src/runtime/entry.ts`, and `src/runtime/appConfig.ts`.

The runtime runs one module package as a capability-aware development host. It
uses the framework HTTP stack, imports manifest-declared provider barrels, and
starts local PostgreSQL-backed workers for declared jobs, durable events, and
pipelines. Installed modules still provide definitions only; an assembled
backend chooses production queues, concurrency, Redis, retention, and process
roles.

## Runtime plan

`resolveModuleRuntimePlan(options)` reads `damat.json` and `module.config.ts`
without importing the module entry or provider files. The returned public
`ModuleRuntimePlan` includes the normalized manifest, detected
`ModuleRuntimeCapabilities`, framework config, package/module roots, and route
base path.

Models, migrations, jobs, events, and pipelines are database-backed. A declared
manifest path enables its capability; conventional directories are detected for
legacy manifests. A service/routes-only module omits database initialization
even if `DATABASE_URL` happens to exist. A database-backed module without
`DATABASE_URL` fails before providers, migrations, or workers start.

Declared durable capabilities use development policy:

- runtime mode `all` with only the declared workers;
- concurrency `1`;
- canonical job and pipeline queues;
- 250 ms PostgreSQL polling;
- optional Redis acceleration when `REDIS_URL` is configured.

The framework module resolver receives the artifact root, not the entry file.
It therefore honors custom manifest paths and imports workflow, job, event, and
pipeline providers exactly once before worker startup.

## Startup order

`startModuleApp(options)` performs this sequence:

1. Resolve the runtime plan and validate/probe the requested port. Port `0` is
   accepted and resolved to an ephemeral port.
2. Require `DATABASE_URL` only when the plan is database-backed.
3. Initialize logger, PostgreSQL, optional Redis, the module, and its provider
   definition files.
4. In the framework pre-durability callback, run one advisory-lock-protected
   migration pass for the module plus the required system catalogs.
5. Verify durability readiness, synchronize pipeline definitions, and start the
   selected workers.
6. Bootstrap file routes from the manifest-declared path and bind HTTP using the
   configured host.

System catalogs are selected narrowly: durability for any durable capability,
jobs for jobs or pipelines, durable events for events, and pipelines for
pipelines. Normal framework startup remains schema-read-only; this migration
callback belongs only to standalone development.

`startModuleApp` retains a second bind-time address-collision guard after the
initial probe. `RunningModuleApp.port` is always the actual bound port and
`routeBasePath` is the configured API mount (default `/api`).

## CLI readiness and shutdown

`runModuleEntry()` prints readiness directly to the terminal after HTTP is
listening:

```text
✓ Module "inventory" ready at http://localhost:7654
  Routes mounted under http://localhost:7654/api
  Press Ctrl-C to stop
```

This output does not use the application logger, so it remains visible with
`LOG_LEVEL=fatal`. SIGINT and SIGTERM share one idempotent stop promise.
The child notifies its supervising watcher as soon as that promise starts.
When a terminal sends Ctrl-C to the whole foreground process group, the
watcher therefore avoids sending the child a second SIGINT during asynchronous
worker cleanup. A signal delivered only to the parent is still forwarded after
a short acknowledgement window.
The development watcher sends SIGTERM and awaits that promise before launching
the next runtime, preventing duplicate worker registrations across reloads.

Shutdown stops HTTP, worker claims/routers, runtime bindings, Redis, durability
globals, PostgreSQL, and the logger in phase order. All handlers are attempted
even if one fails. Partial startup failures run the same cleanup for every
resource that was initialized.

## Port behavior

Port precedence is `options.port` → `PORT` → `module.config.ts` → `7654`.
Values must be integers from 0 through 65535. Fixed ports are probed before
database creation, module imports, or migrations. An occupied port throws
`ModulePortInUseError`; port `0` reports the actual selected port after binding.

## Public result

```ts
interface RunningModuleApp {
  app: Hono;
  server: ModuleServerHandle;
  port: number;
  manifest: ModuleManifest;
  capabilities: ModuleRuntimeCapabilities;
  routeBasePath: string;
  stop(): Promise<void>;
}
```

Always await `stop()` in tests. Repeated calls share the same shutdown work and
the port is reusable after it resolves.
