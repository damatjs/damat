[Damat Guide](../GUIDE.md) › Deployment

# 19. Deployment

A Damat app deploys like any Bun HTTP service: build, run migrations, start.
There is no framework-specific hosting requirement — anything that can run a
container (or Bun directly) and reach Postgres works.

## The release sequence

Every deploy, in this order:

```bash
damat build                 # type-check + bundle to .damat/dist
bun damat-orm migrate:up    # apply pending migrations (idempotent)
damat start                 # serve the built app
```

Set these in the production environment:

- `NODE_ENV=production`
- `DATABASE_URL` — your production Postgres
- `REDIS_URL` — if you use cache, queues, locks, sessions, or rate limiting
- Any module credentials your `damat.config.ts` modules require (each module's
  `.env` keys were synced into `.env.example` when you installed it)

## A minimal Dockerfile

This works for any app scaffolded with `create-damat-app`:

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=build /app .
ENV NODE_ENV=production
EXPOSE 6543
CMD ["sh", "-c", "bun damat-orm migrate:up && bun run start"]
```

Running migrations at container start is the simplest correct default —
`migrate:up` is idempotent and per-module, so replicas racing on boot apply
each migration once. On larger setups, run `migrate:up` as a separate release
step (CI job, init container) before rolling instances.

## Health checks

Every Damat app serves `GET /health` — point your load balancer or
orchestrator's liveness probe at it.

## The reference setup

The monorepo's [default backend](../../backend/default/README.md) ships a
worked example of all of this: a multi-stage `Dockerfile` and a
`docker-compose.yml` with Postgres (pgvector), Redis, and Adminer. If you
cloned the repo:

```bash
docker-compose up -d db redis        # local infra
docker build -t damatjs/api ./backend/default
docker-compose up api
```

---

Prev: [← CLI reference](./18-cli-reference.md) · [Guide home](../GUIDE.md) · Next: [Package reference →](./20-package-reference.md)
