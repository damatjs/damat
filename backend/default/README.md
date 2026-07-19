# @damatjs/default

The reference Damat backend. It shows how an application composes modules,
links, routes, workflows, durable jobs, durable events, pipelines, inspection clients, and
separate process roles from one build.

## Run locally

```bash
bun install
cd backend/default
bun run db:setup
bun run dev
```

PostgreSQL is required for modules, jobs, durable events, and pipelines. Redis is optional:
when configured it holds rebuildable ready indexes, worker liveness, wake-ups,
and inspection invalidations. PostgreSQL remains the complete source of truth.
Healthy Redis leaves a 30-second PostgreSQL safety scan; degraded mode discovers
work within five seconds.

Useful commands:

```bash
bun run dev          # development server and enabled workers
bun run build        # type-check and create .damat/dist
bun run start        # run the production build
bun run db:setup     # create the selected database and apply all migrations
bun run db:migrate   # apply system and module migrations
bun run db:status    # list applied and pending migrations by owner
bun run test
```

At the monorepo root, `bun run test` provisions disposable PostgreSQL and Redis,
migrates a dedicated recovery database, and runs the reference backend's four
job/event SIGKILL cases in a process isolated from its unit tests. The live and
unavailable Redis paths are mandatory rather than silently skipped. Package
tests also emit LCOV for the repository source-inclusion audit.

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
| Onboarding pipeline | `src/pipelines/`                    | A durable graph composing the workflow, event, and report job                   |
| Atomic dispatch     | `src/examples/transactionalWork.ts` | A domain write, job enqueue, and event publish sharing one transaction executor |
| Operations          | `src/examples/inspectWork.ts`       | Headless job and event inspection clients; no routes are mounted automatically  |

App-owned jobs, events, and pipelines are side-effect imported by `damat.config.ts` so their
definitions exist before the framework starts selected workers. Installed module
providers are loaded through each module's `damat.json`.

The onboarding workflow converts ORM `Date` values to ISO strings before its
result crosses the durable pipeline boundary. Pipeline capability results are
stored as PostgreSQL `jsonb` and must remain recursively JSON-safe.

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
worker layers. Deployment variables override config independently:

```bash
DAMAT_RUNTIME_MODE=server bun run start
DAMAT_RUNTIME_MODE=worker DAMAT_WORKER_TYPES=jobs bun run start
DAMAT_RUNTIME_MODE=worker DAMAT_WORKER_TYPES=events bun run start
DAMAT_RUNTIME_MODE=worker DAMAT_WORKER_TYPES=pipelines bun run start
```

`server` mounts HTTP without workers. `worker` is headless and requires at least
one enabled capability. `all` serves HTTP and runs selected workers.

## Docker Compose

The Compose file builds one image from the monorepo root and uses it for five
roles:

1. `migrate` runs `bun run db:migrate` once against the provisioned database.
2. `api` waits for migration success and runs in `server` mode.
3. `jobs` waits for migration success and runs the jobs worker only.
4. `events` waits for migration success and runs the event router/worker only.
5. `pipelines` waits for migration success and runs the pipeline router/internal worker only.

Create one protected, gitignored environment file for a disposable staging
drill, then start PostgreSQL and the application:

```bash
bun run --cwd backend/default ops:env
docker compose --env-file backend/default/.env.production.local \
  -f backend/default/docker-compose.yml up --build
```

The stack uses separate bootstrap, migration, runtime, and backup database
roles. The runtime role cannot create schemas or own tables. PostgreSQL is not
published, API binding defaults to `127.0.0.1`, and application containers are
non-root, read-only, capability-free, and protected from privilege escalation.
Use private managed services and deployment-secret injection in production.
The reference user module also requires a unique `BETTER_AUTH_SECRET` of at
least 32 characters; Compose derives its public auth URL from `PUBLIC_BASE_URL`.

Redis is an optional accelerator profile. Enable it and provide its URL:

```bash
docker compose --env-file backend/default/.env.production.local \
  -f backend/default/docker-compose.yml --profile accelerator up --build
```

The reference Redis disables the default account, creates an authenticated
`damat` account, grants its key access and required `&damat:*` and
`&damat-events` channels, and denies administrative and dangerous commands.

Only the API has an HTTP health check. Worker state, capacity, attempts,
failures, retries, recovery, and logs are available through the headless durable
inspection clients.

The restore drill intentionally uses `--no-owner --no-acl`; bootstrap the
target environment's least-privilege roles first, then restore portable schema
and data without replaying source-cluster role grants.

## Production acceptance

The repository CI performs the same production-like exercise available
locally: environment policy, migration gating, health/routes, protected
Prometheus metrics, least-privilege PostgreSQL and Redis, live worker
capabilities, load thresholds, custom-format backup, restore into a disposable
database, and runtime rollback. Run individual checks with:

```bash
bun run --cwd backend/default ops:validate
bun run --cwd backend/default ops:smoke
bun run --cwd backend/default ops:load
COMPOSE_ENV_FILE=backend/default/.env.production.local \
  bun run --cwd backend/default ops:drill
docker compose --env-file backend/default/.env.production.local \
  -f backend/default/docker-compose.yml --profile operations run --rm acceptance
```

Production logs use JSON at `info` level. `/metrics` requires
`Authorization: Bearer $METRICS_TOKEN`; start with
`ops/prometheus-alerts.yml` and route critical alerts to an owned on-call
receiver. `ops/worker-health.ts` is an exit-code probe for job, event, and
pipeline worker capabilities. Rollback accepts an immutable previous image
digest and deliberately leaves forward database migrations in place.

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
- [Durable pipelines](../../docs/guide/10c-pipelines.md)
- [Deployment](../../docs/guide/19-deployment.md)
- [Framework](../../packages/framework/README.md)
- [Durability](../../packages/core/durability/README.md)
