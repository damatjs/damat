[Damat Guide](../GUIDE.md) › Deployment

# 17. Deployment

The default backend ships a multi-stage `Dockerfile` and a `docker-compose.yml`
with Postgres (pgvector), Redis, and Adminer.

```bash
# local infra
docker-compose up -d db redis

# build & run the API image
docker build -t damatjs/api ./backend/default
docker-compose up api
```

For production: set `NODE_ENV=production`, provide `DATABASE_URL`/`REDIS_URL`,
run `damat build` then `damat start`, and apply migrations with
`damat-orm migrate:up` as part of your release. See the
[default backend README](../../backend/default/README.md) for the full setup.

---

Prev: [← CLI reference](./16-cli-reference.md) · [Guide home](../GUIDE.md) · Next: [Package reference →](./18-package-reference.md)
