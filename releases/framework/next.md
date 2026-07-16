# @damatjs/framework Unreleased

## Changed

Module locations now produce one resolved runtime surface. Packaged routes
mount through external file-router providers, and declared workflow, job,
event, and pipeline providers load before the job worker starts.

Job service initialization now configures the PostgreSQL durability client and
starts the fenced durable worker without requiring Redis. The queue option is
named `queue`. Configuring `services.jobs` without
`projectConfig.databaseUrl` now fails startup instead of warning and silently
disabling the service.

## Action required

Package modules need a valid `damat.json`; package mode remains early alpha.
Job-enabled applications must configure `projectConfig.databaseUrl`, run
`bun run db:migrate`, and rename `services.jobs.queueName` to `queue`.
