[Damat Guide](../GUIDE.md) › Troubleshooting

# 21. Troubleshooting

| Symptom                                   | Likely cause / fix                                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Runtime says the database is missing      | Configure `projectConfig.databaseUrl` / `DATABASE_URL`, then run `damat-orm migrate:up`.                                                      |
| Runtime reports missing system migrations | Run `damat-orm migrate:status`, then `damat-orm migrate:up` before starting API/workers. Startup checks readiness but never creates tables.   |
| Unknown runtime mode or worker capability | Use `server`, `worker`, or `all`; worker names are `jobs` and `events`. Check `DAMAT_RUNTIME_MODE` and `DAMAT_WORKER_TYPES`.                  |
| Selected capability is unavailable        | Enable `services.jobs` or `services.events.durable` in config, or remove it from worker selection.                                            |
| Worker mode has no capabilities           | Enable and select at least one durable capability.                                                                                            |
| Jobs remain queued                        | Confirm the worker selects `jobs`, its configured queue matches the definition, migrations are current, and PostgreSQL is reachable.          |
| Durable events remain unrouted            | Confirm the process selects `events`, definitions/consumers load before startup, and event migrations are current.                            |
| Work ran again after a crash              | Delivery is at least once. Use `context.withIdempotency` for database effects and provider-supported idempotency keys externally.             |
| Redis is unavailable                      | Durable work continues through PostgreSQL polling. Expect higher wake-up latency; fix `REDIS_URL` only if Redis-backed features are required. |
| Inspection client rejects its key         | Supply a stable, non-empty `cursorSigningKey`; rotating it invalidates issued cursors.                                                        |
| No jobs/events admin endpoint exists      | Inspection clients are intentionally headless. Add authenticated, authorized application routes or a CLI/UI yourself.                         |
| Module credentials fail startup           | Check the environment keys declared by its `module.json` and credentials schema.                                                              |
| `module add` cannot find a registry ref   | Set `DAMAT_MODULE_REGISTRY`, or install from a path/git source.                                                                               |
| `module add` refuses verification         | Respect rejected/revoked status; for unverified sources use the configured `off`, `warn`, or `require` policy intentionally.                  |
| MCP cannot spawn `damat`                  | Put `damat` on `PATH` or set `DAMAT_CLI` in `.mcp.json`.                                                                                      |

Worker-registry state is observational. Diagnose recovery from the persisted
lease, attempts, and activity timeline; an expired fenced lease is what makes
work reclaimable.

Building Damat itself? Each package's `docs/` folder is the maintainer guide,
and [AGENTS.md](../../AGENTS.md) maps the monorepo.

---

Prev: [← Package reference](./20-package-reference.md) · [Guide home](../GUIDE.md)
