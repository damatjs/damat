[Damat Guide](../GUIDE.md) › Troubleshooting

# 21. Troubleshooting

## Database does not exist

Confirm `DATABASE_URL`, then run:

```bash
bun run db:setup
```

The command creates the named PostgreSQL database and applies system, link, and
module migrations. Creating a database requires `CREATEDB` or equivalent
permission. If the database is provisioned already, use `bun run db:migrate`.

## Runtime reports missing migrations or tables

Framework startup is intentionally read-only. Run `bun run db:status`, then
`bun run db:migrate`. Generated development `bun run dev` scripts perform the
setup preflight automatically; custom/production scripts must run a migration
job first.

## Standalone module cannot start

For a database-backed module, verify `.env` contains `DATABASE_URL`; `bun run
dev` creates the database and runs the required module/system migration pass.
An occupied fixed port fails before that work with a `--port <port>` hint. Use
`damat module dev --port 0` to request an ephemeral port.
If active worker rows increase after a source reload, upgrade the CLI; the
watcher must await the old runtime's shutdown before starting its replacement.
If interactive Ctrl-C leaves active worker rows, verify the CLI includes the
foreground-process-group acknowledgement fix; parent-only signal tests do not
exercise the duplicate-SIGINT race.

For startup details, either `damat --verbose module dev` or
`damat module dev --verbose` prints the full underlying stack.

## Unknown runtime mode or worker

Modes are `server`, `worker`, and `all`. Worker names are `jobs`, `events`, and
`pipelines`. Check config plus `DAMAT_RUNTIME_MODE` and `DAMAT_WORKER_TYPES`.

`worker` mode must select at least one enabled capability. `server` starts no
workers. Enable the matching `services.jobs`, `services.events.durable`, or
`services.pipelines` configuration before selecting it.

## Jobs remain queued

Check:

- a process selects `jobs`;
- the job definition was imported before bootstrap;
- the definition and worker queue agree;
- jobs/durability migrations are current;
- PostgreSQL is reachable.

Redis is not required. Its absence affects wake-up latency, not durable truth.

## Durable events remain unrouted or undelivered

Check that a process selects `events`, event definitions and stable consumers
load before bootstrap, and events/durability migrations are current. Routing
and each consumer delivery are separate persisted stages.

## Pipeline does not advance

Check that a process selects `pipelines`, the pipeline definition/version is
registered, referenced jobs/events/workflows are registered, and pipeline
migrations are current. A direct job node also needs an appropriate job worker;
durable event delivery needs event workers.

## Work executes again after a crash

Durable workers are at least once. Use `context.withIdempotency` for database
effects and send the same stable idempotency key to external providers when
supported. Diagnose ownership from the lease, attempt, transition, and activity
timeline—not worker liveness alone.

## Redis is unavailable

Jobs, durable events, and pipelines continue through coordinated PostgreSQL
fallback. Expect higher wake-up latency. Cache, locks, sessions, rate limits,
and ephemeral cross-process broadcast still require Redis when used.

## Redis reports `NOPERM` for wake-up or broadcast channels

Preserve the authenticated user's command/key rules and add channel patterns:

```text
&damat:*
&damat-events
```

Verify `SUBSCRIBE` and `PUBLISH`, persist direct-server changes with
`CONFIG REWRITE`, and keep the same ACL in container configuration. The runtime
logs one actionable degradation warning and uses PostgreSQL fallback until the
capability probe recovers.

## Database connection activity looks duplicated

One app process should create one pool shared by HTTP, modules, jobs, events,
pipelines, inspection, and maintenance. A pool intentionally uses several
physical connections up to its maximum. Investigate multiple pool construction,
not ordinary checkout reuse. Healthy Redis removes one-second idle polling;
PostgreSQL safety scans and durable worker snapshots remain periodic.

## Inspection cursor or control fails

Use a stable non-empty cursor signing key. Rotating it invalidates existing
cursors. Administrative controls require actor, reason, and idempotency. The
framework mounts no admin routes; the application must supply authenticated and
authorized HTTP, CLI, or UI adapters.

## Module installation cannot resolve a source

Set `DAMAT_REGISTRY` (or the module-registry compatibility variable), or install
from a direct path/Git origin. Never bypass rejected or revoked verification.
Run `damat module plan` before installation and review the integration notices.

## MCP cannot spawn Damat

Put the `damat` binary on `PATH` or set `DAMAT_CLI` in `.mcp.json`. Also set the
application directory and registry environment expected by the MCP server.

## Building the monorepo fails or tests interfere

Use the repository scripts:

```bash
bun run build
bun run test
```

The build is serialized to stay within memory limits. The root test script
isolates package mocks and provisions independent PostgreSQL databases. Running
plain `bun test` at the repository root discovers every test in one Bun process
and can leak package mocks across suites.

## Build tries to resolve TypeScript or codegen asks for `pg-cloudflare`

`damat build` and `damat module build` run `bun run tsc --noEmit` from the
target project. Install `typescript` in that project when the compiler is
missing; the build never uses `bun x` or registry resolution. Use
`--no-typecheck` only when intentionally deferring the gate.

Application migrations and codegen bundle `damat.config.ts` with the optional
`pg-cloudflare` transport external. A direct application dependency is not
required merely to load config or generate code. If an older CLI reports that
module as missing, upgrade the coordinated Damat tooling packages rather than
adding a scaffold dependency.

Package internals live in each package's `docs/` folder. The repository map and
quality gates are in [AGENTS.md](../../AGENTS.md).

---

Prev: [← Package reference](./20-package-reference.md) · [Guide home](../GUIDE.md)
