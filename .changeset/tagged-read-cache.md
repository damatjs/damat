---
"@damatjs/redis": minor
"@damatjs/services": minor
---

Opt-in, Redis-backed read caching for the service layer (the Next.js fetch-cache model):

- **@damatjs/redis**: new tagged cache primitives — `cacheSetTagged(key, value, ttl, tags)` stores an entry and indexes it under invalidation tags (`cache-tag:<tag>` sets), and `invalidateCacheTags(tags)` deletes every entry in a tag group at once (`revalidateTag` semantics).
- **@damatjs/services**: nothing is cached by default. Enabling is two explicit steps: the service config opts into the machinery (`ModuleService({ models, cache: { defaultTtl, prefix } })`), and each read chooses where its data comes from (`findMany({ where, cache: true | { ttl, tags } })` — supported on `find`/`findMany`/`findById`/`findOne`/`count`/`exists`). Every cached entry carries the implicit `model:<name>` tag, and all writes (`create`/`createMany`/`upsert`/`upsertMany`/`update`/`updateOne`/`delete`/`softDelete`/`restore`) invalidate that tag automatically after they succeed; custom tags are reset manually with `invalidateCacheTags([...])` (re-exported by `@damatjs/framework`). Fail-open by design: Redis missing or down falls through to the database with a debug log; reads inside a transaction always hit the database; `null` results are never cached (indistinguishable from a miss) while `false`/`0` are; cache keys are stable hashes of the call arguments.
