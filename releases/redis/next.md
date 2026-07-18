# @damatjs/redis Unreleased

> Documents the Redis ACL contract required by framework durability acceleration.

## What changed

Redis remains an optional, rebuildable acceleration dependency. Framework
durability uses the `damat:*` Pub/Sub namespace and ephemeral event broadcast
uses `damat-events`.

## Changed / improved

- Authenticated deployments require channel patterns `&damat:*` and
  `&damat-events` in addition to their existing command/key rules.
- Durable Redis authorization failure activates PostgreSQL fallback and bounded
  recovery instead of repeated publish/subscription warnings.

## Breaking

- None for users without Redis ACLs. Restricted Redis users need channel rules.

## Action required

Apply the additive ACL patterns, verify `SUBSCRIBE` and `PUBLISH` for both
durable wake-up channels and `damat-events`, run `CONFIG REWRITE` for a direct
server, and preserve the rule in container configuration.

## References

- Current behavior: [Redis README](../../packages/core/redis/README.md)
- Source: `packages/framework/src/services/initialize/`
