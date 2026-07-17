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

Production variables normally include:

- `NODE_ENV=production`
- `DATABASE_URL` for modules and durable infrastructure
- optional `REDIS_URL` for cache/pub-sub/locks and faster durable wake-ups
- module credentials declared by installed modules
- `DAMAT_RUNTIME_MODE` and `DAMAT_WORKER_TYPES` for each process role

## One image, several roles

The same image can back an API and dedicated workers:

| Role      | Environment                                              | Responsibility                           |
| --------- | -------------------------------------------------------- | ---------------------------------------- |
| Migration | none                                                     | Run `bun run db:migrate` once and exit   |
| API       | `DAMAT_RUNTIME_MODE=server`                              | Serve HTTP; no workers                   |
| Jobs      | `DAMAT_RUNTIME_MODE=worker`, `DAMAT_WORKER_TYPES=jobs`   | Run only job workers                     |
| Events    | `DAMAT_RUNTIME_MODE=worker`, `DAMAT_WORKER_TYPES=events` | Run the durable router and event workers |

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
results, controls, and worker records. Redis messages are optional latency hints.
If Redis is absent or lost, workers continue polling PostgreSQL and expired
leases remain recoverable.

Workers provide at-least-once execution. Use handler `withIdempotency` for
database effects and pass the same stable key to external providers when they
support idempotency.

## Health and operations

Point HTTP liveness/readiness probes at `GET /health` on API processes. Headless
workers do not need an HTTP server. Inspect their status, capacity, attempts,
failures, retries, recovery, progress, and logs through
`createJobInspectionClient` and `createDurableEventInspectionClient`.

The framework mounts no operational administration routes. Applications own
authentication, authorization, and presentation for a dashboard, CLI, or
automation.

## Reference Compose setup

From the repository root:

```bash
export POSTGRES_PASSWORD='replace-with-a-long-random-value'
docker compose -f backend/default/docker-compose.yml up --build
```

The migration/API/jobs/events services share `damat-default:local`; every
runtime depends on successful migration completion. The reference PostgreSQL
service requires this password and is not published on the host. Use private
managed PostgreSQL and deployment-secret injection outside local evaluation.
Redis is an optional `accelerator` profile:

```bash
export POSTGRES_PASSWORD='replace-with-a-long-random-value'
REDIS_URL=redis://redis:6379 \
docker compose -f backend/default/docker-compose.yml --profile accelerator up --build
```

---

Prev: [← CLI reference](./18-cli-reference.md) · [Guide home](../GUIDE.md) · Next: [Package reference →](./20-package-reference.md)
