[Damat Guide](../GUIDE.md) › Deployment

# 19. Deployment

One Damat build can serve HTTP, execute selected durable workers, or do both.
Any platform that can run Bun and reach PostgreSQL can host it.

## Release sequence

Build once, migrate once, then start runtime roles:

```bash
damat build
damat-orm migrate:up
damat start
```

Startup checks that required system migrations exist; it never creates tables.
Run migrations as a release job or one-shot container and require successful
completion before API and workers start.

Provisioned production databases normally use `migrate:up`. Use
`damat-orm database:setup` only when the deployment role is intentionally
allowed to create the named database; that requires PostgreSQL `CREATEDB` or an
equivalent administrative role.

Production variables normally include:

- `NODE_ENV=production`
- `DATABASE_URL` for modules and durable infrastructure
- optional `REDIS_URL` for cache/pub-sub/locks and faster durable wake-ups
- module credentials declared by installed modules
- `DAMAT_RUNTIME_MODE` and `DAMAT_WORKER_TYPES` for each process role

## One image, several roles

The same image can back an API and dedicated workers:

| Role      | Environment                                                 | Responsibility                           |
| --------- | ----------------------------------------------------------- | ---------------------------------------- |
| Migration | none                                                        | Run `bun run db:migrate` once and exit   |
| API       | `DAMAT_RUNTIME_MODE=server`                                 | Serve HTTP; no workers                   |
| Jobs      | `DAMAT_RUNTIME_MODE=worker`, `DAMAT_WORKER_TYPES=jobs`      | Run only job workers                     |
| Events    | `DAMAT_RUNTIME_MODE=worker`, `DAMAT_WORKER_TYPES=events`    | Run the durable router and event workers |
| Pipelines | `DAMAT_RUNTIME_MODE=worker`, `DAMAT_WORKER_TYPES=pipelines` | Run pipeline routing and internal nodes  |

`DAMAT_RUNTIME_MODE` overrides config mode and `DAMAT_WORKER_TYPES` independently
overrides worker selection. An `all` process can serve HTTP and workers in one
container for smaller deployments.

## Monorepo Docker build

The reference backend builds the dependency closure before building the app:

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /workspace
COPY . .
RUN bun install --frozen-lockfile
RUN bunx turbo run build --filter=@damatjs/default...

FROM oven/bun:1 AS runtime
WORKDIR /workspace
COPY --chown=bun:bun --from=build /workspace /workspace
USER bun
WORKDIR /workspace/backend/default
CMD ["bun", "run", "start"]
```

An application outside this monorepo can build its own package directly, but it
must include all runtime dependencies and the `.damat/dist` production bundle.

## PostgreSQL and Redis

PostgreSQL stores work, attempts, leases, retries, activity, progress, logs,
results, controls, worker snapshots, acceleration checkpoints, and audit records.
Each process shares one PostgreSQL pool across HTTP and durable services; the
pool retains normal bounded concurrency instead of using `max: 1`.

Redis stores rebuildable ready identifiers, 10-second worker liveness, wake-ups,
and inspection invalidations. Healthy Redis leaves a 30-second PostgreSQL
safety scan. If Redis is absent, unauthorized, or lost, coordinated PostgreSQL
polling discovers work within five seconds and expired leases remain recoverable.
Recovery rebuilds Redis from PostgreSQL.

Workers provide at-least-once execution. Use handler `withIdempotency` for
database effects and pass the same stable key to external providers when they
support idempotency.

## Health and operations

Point HTTP liveness/readiness probes at `GET /health` on API processes. Headless
workers do not need an HTTP server. Inspect their status, capacity, attempts,
failures, retries, recovery, progress, and logs through
`createJobInspectionClient`, `createDurableEventInspectionClient`, and the
pipeline inspection client.

The framework mounts no operational administration routes. Applications own
authentication, authorization, and presentation for a dashboard, CLI, or
automation.

## Reference Compose setup

From the repository root, generate disposable local secrets and start the
production-shaped stack:

```bash
bun run --cwd backend/default ops:env
docker compose --env-file backend/default/.env.production.local \
  -f backend/default/docker-compose.yml up --build
```

The migration/API/jobs/events/pipelines services share `damat-default:local`;
every runtime depends on successful migration completion. PostgreSQL uses
distinct bootstrap, migration, runtime, and backup roles and is not published.
The API binds to localhost by default. Application containers are non-root,
read-only, capability-free, and protected from privilege escalation. Use
private managed PostgreSQL and deployment-secret injection outside local
evaluation. The vendor-neutral reference backend does not select an auth
provider; installed provider modules declare their own reviewed secrets.
Redis is an optional `accelerator` profile:

```bash
docker compose --env-file backend/default/.env.production.local \
  -f backend/default/docker-compose.yml --profile accelerator up --build
```

The reference Redis disables its default user. Its authenticated application
user receives `&damat:*` and `&damat-events`, required data commands, and no
administrative or dangerous commands.

## Acceptance and rollback

`bun run check:release` performs clean-checkout, lint, type, build, complete
test, dependency vulnerability, secret, and deployment-security gates. The
legacy whole-repository line-limit cleanup can remain under an explicit waiver;
new changes still stay within the repository limit.

The production-readiness workflow additionally starts the split runtime,
checks health, routes, protected Prometheus metrics, database and Redis least
privilege, live job/event/pipeline worker capabilities, and load thresholds.
It also requires completed job, event, and pipeline executions with Redis both
available and unavailable. It then performs a custom-format backup, restores
it into a disposable PostgreSQL target with `--exit-on-error`, and recreates
runtime roles from a previous image. Database migrations are forward-only and
remain after runtime rollback, so releases must preserve rollback compatibility.
Restore uses `--no-owner --no-acl`; recreate deployment roles through the
target environment's bootstrap before attaching the restored database.

Production deployments set `DAMAT_IMAGE`, `POSTGRES_IMAGE`, and `REDIS_IMAGE`
to registry sha256 digests. `/metrics` requires the bearer `METRICS_TOKEN`.
Use `backend/default/ops/prometheus-alerts.yml` as the initial API alert rules
and schedule `ops/worker-health.ts` as the headless worker probe. Backups are
not accepted until real durable work and a restore drill succeed.

---

Prev: [← CLI reference](./18-cli-reference.md) · [Guide home](../GUIDE.md) · Next: [Package reference →](./20-package-reference.md)
