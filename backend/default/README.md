# @damatjs/default

The reference Damat backend. It shows how an application composes modules,
links, routes, workflows, durable jobs, durable events, inspection clients, and
separate process roles from one build.

## Run locally

```bash
bun install
cd backend/default
bun run db:migrate
bun run dev
```

PostgreSQL is required for modules, jobs, and durable events. Redis is optional:
when configured it holds rebuildable ready indexes, worker liveness, wake-ups,
and inspection invalidations. PostgreSQL remains the complete source of truth.
Healthy Redis leaves a 30-second PostgreSQL safety scan; degraded mode discovers
work within five seconds.

Useful commands:

```bash
bun run dev          # development server and enabled workers
bun run build        # type-check and create .damat/dist
bun run start        # run the production build
bun run db:migrate   # apply system and module migrations
bun run db:status    # list applied and pending migrations by owner
bun run test
```

## Application map

| Capability          | Location                            | What it demonstrates                                                            |
| ------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| Configuration       | `damat.config.ts`                   | Database, optional Redis, runtime roles, durable services, modules, and links   |
| User module         | `src/modules/user/`                 | Models, generated service accessors, auth configuration, and migrations         |
| Organization module | `src/modules/organization/`         | A second independent module                                                     |
| Links               | `src/links/`                        | App-owned cross-module relationships                                            |
| HTTP routes         | `src/api/routes/`                   | File routing, dynamic parameters, auth, and workflows                           |
| User onboarding     | `src/workflows/user/`               | Forward steps and compensation                                                  |
| Report job          | `src/jobs/generateReport.ts`        | Durable progress, structured logs, retry policy, and JSON result                |
| User-created event  | `src/events/`                       | One durable event with `auditUser` and `notifyUser` consumers                   |
| Atomic dispatch     | `src/examples/transactionalWork.ts` | A domain write, job enqueue, and event publish sharing one transaction executor |
| Operations          | `src/examples/inspectWork.ts`       | Headless job and event inspection clients; no routes are mounted automatically  |

App-owned jobs and events are side-effect imported by `damat.config.ts` so their
definitions exist before the framework starts selected workers. Installed module
providers are loaded through each module's `damat.json`.

## Durable sample

`reports.generate` runs on the `reports` queue. Its handler stores progress and
structured logs in PostgreSQL. `user.created` is routed to two stable consumer
identities, and each delivery receives its own attempts, lease, retry state,
progress, logs, result, and activity history.

The transaction example uses the executor supplied by
`ModuleService.transaction`:

```ts
await userService.transaction(async (executor) => {
  const user = await userService.users.create({ data: input });
  await enqueueJob("reports.generate", report, { executor });
  await publishDurableEvent("user.created", user, { executor });
});
```

The job and event become visible only if the domain transaction commits.
The transaction writes acceleration-outbox signals beside the job/event rows.
The framework relay publishes them only after commit, so rollback emits no Redis
wake-up and caller-owned transactions do not lose the fast path.

Inspection remains application-owned:

```ts
const operations = createReferenceInspection(process.env.CURSOR_KEY!);
const jobs = await operations.jobs.listRuns({ views: ["failed"] });
const events = await operations.events.listEvents({ views: ["failed"] });
```

The application must place authentication and authorization around any route,
CLI, or UI that exposes those clients.

## Runtime roles

The config defaults to `all`, which serves HTTP and runs both durable
capabilities. Deployment variables override config independently:

```bash
DAMAT_RUNTIME_MODE=server bun run start
DAMAT_RUNTIME_MODE=worker DAMAT_WORKER_TYPES=jobs bun run start
DAMAT_RUNTIME_MODE=worker DAMAT_WORKER_TYPES=events bun run start
```

`server` mounts HTTP without workers. `worker` is headless and requires at least
one enabled capability. `all` serves HTTP and runs selected workers.

## Docker Compose

The Compose file builds one image from the monorepo root and uses it for four
roles:

1. `migrate` runs `bun run db:migrate` once.
2. `api` waits for migration success and runs in `server` mode.
3. `jobs` waits for migration success and runs the jobs worker only.
4. `events` waits for migration success and runs the event router/worker only.

Start PostgreSQL and the application:

```bash
export POSTGRES_PASSWORD='replace-with-a-long-random-value'
docker compose -f backend/default/docker-compose.yml up --build
```

The password is required and PostgreSQL is not published on the host. This
database is a local reference dependency; use a private managed database and
secret injection for production.

Redis is an optional accelerator profile. Enable it and provide its URL:

```bash
export POSTGRES_PASSWORD='replace-with-a-long-random-value'
REDIS_URL=redis://redis:6379 \
docker compose -f backend/default/docker-compose.yml --profile accelerator up --build
```

For authenticated Redis, preserve the user's existing rules and add
`&damat:*` and `&damat-events`. Verify publish/subscribe access to
`damat:jobs:wakeup`, `damat:events:wakeup`, and `damat-events`, persist direct
server changes with `CONFIG REWRITE`, and keep the ACL in the container-mounted
configuration for recreation.

Only the API has an HTTP health check. Worker state, capacity, attempts,
failures, retries, recovery, and logs are available through the headless durable
inspection clients.

## Recovery contract

Workers use fenced PostgreSQL leases. If a process is killed, its lease expires
and a replacement records recovery before claiming a new attempt. Redis loss
does not lose work or inspection history. On recovery, the framework rebuilds
Redis coordination indexes from PostgreSQL. Database effects that
must survive retries should use `context.withIdempotency`, while external
providers should receive the same stable idempotency key when supported.

## More documentation

- [Damat Guide](../../docs/GUIDE.md)
- [Events and background jobs](../../docs/guide/10b-events-and-jobs.md)
- [Deployment](../../docs/guide/19-deployment.md)
- [Framework](../../packages/framework/README.md)
- [Durability](../../packages/core/durability/README.md)
