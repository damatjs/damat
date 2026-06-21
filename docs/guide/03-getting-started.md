[Damat Guide](../GUIDE.md) › Getting started

# 3. Getting started

## Prerequisites

- **[Bun](https://bun.sh) ≥ 1.1** — the runtime and package manager (Bun runs
  TypeScript directly; there is no separate compile step in dev).
- **PostgreSQL 15+** — with the [`pgvector`](https://github.com/pgvector/pgvector)
  extension if you want vector columns.
- **Redis 7+** *(optional)* — only needed for cache, queues, distributed locks,
  sessions, and rate limiting.

The fastest way to get Postgres + Redis locally is the `docker-compose.yml` that
ships with the default backend (see [Deployment](./19-deployment.md)).

## Option A — scaffold a new app

```bash
bunx create-damat-app@latest my-app
cd my-app
bun install
cp .env.example .env        # then edit DATABASE_URL etc.
bun run db:migrate          # apply migrations
bun run dev                 # start the dev server (hot reload)
```

`create-damat-app` clones a starter, prepares the project, and can optionally
create a Postgres database for you. See
[its docs](../../packages/cli/create-damat-app/README.md) for flags
(`--module`, `--use-bun`, `--directory-path`, …).

## Option B — run this monorepo's reference backend

```bash
git clone https://github.com/damatjs/damat.git
cd damat
bun install
bun run build                       # build all packages

cd backend/default
cp .env.example .env
docker-compose up -d db redis       # start Postgres + Redis
bun run db:migrate                  # apply migrations
bun run dev                         # start at http://localhost:6543
```

Once running, hit the health check:

```bash
curl http://localhost:6543/health
```

## Project structure

A Damat app is organized around modules and file-based routes:

```
my-app/
├── damat.config.ts          # the single entry point: project config + modules
├── .env                     # secrets and connection strings
├── package.json             # scripts call the `damat` / `damat-orm` CLIs
└── src/
    ├── api/
    │   ├── middleware/       # Hono middleware (auth, etc.)
    │   └── routes/           # file-based routes -> /api/* URL paths
    │       ├── posts/route.ts            # GET/POST  /api/posts
    │       └── users/[userId]/route.ts   # GET/PUT/DELETE /api/users/:userId
    ├── modules/             # your domain modules
    │   └── user/
    │       ├── index.ts      # defineModule(...)
    │       ├── service.ts    # ModuleService({ models, credentialsSchema })
    │       ├── config/       # credentials schema + loader
    │       ├── models/       # ORM models
    │       ├── migrations/   # SQL migrations
    │       └── types/        # generated row types + zod schemas
    ├── links/               # cross-module relationships
    └── workflows/           # saga workflows + steps
```

The two files you touch most: **`damat.config.ts`**
([next chapter](./04-configuration.md)) and the files inside
**`src/modules/<name>/`** ([modules & services](./07-modules-and-services.md)).

---

Prev: [← Concepts](./02-concepts.md) · [Guide home](../GUIDE.md) · Next: [Configuration & environment →](./04-configuration.md)
