# @damatjs/module Unreleased

> Standalone module development now hosts declared durable capabilities and reports an observable, safely stoppable HTTP lifecycle.

## What changed

The standalone runtime now resolves the module artifact root and builds a public
capability plan from `damat.json` plus `module.config.ts`. Custom provider paths
are retained, database use is based on declared capabilities, and service-only
modules do not connect merely because `DATABASE_URL` exists.

Startup probes fixed ports first, applies the required system catalogs and the
module migration in one advisory-locked pass before durability, starts only the
declared local workers, and returns the actual port plus route base. Readiness is
written directly to the terminal and shutdown is ordered and idempotent.

## Added

- `ModuleRuntimePlan`, `ModuleRuntimeCapabilities`, and runtime-plan helpers.
- `RunningModuleApp.capabilities` and `RunningModuleApp.routeBasePath`.
- Immediate fixed-port collision errors and dynamic-port reporting.

## Changed / improved

- Standalone durable defaults use concurrency 1 and 250 ms PostgreSQL polling.
- PostgreSQL-only jobs, events, and pipelines execute during module development.
- Partial startup failures close all initialized resources.

## Breaking

- Database-backed standalone modules now require `DATABASE_URL` before startup.
- This package requires a version bump before release; do not publish it as the
  existing version.

## Action required

All five packages require version bumps; do not publish them in this change.
Release and upgrade the coordinated five-package set together:
`@damatjs/module`, `@damatjs/cli-module`, `@damatjs/framework`,
`@damatjs/damat-cli`, and `@damatjs/services`. Services is a required member,
not an incidental extra: service-only scaffolds depend on its database-free
empty-model initialization. Ensure every declared capability path is
intentional and set `DATABASE_URL` for modules that declare models, migrations,
jobs, events, or pipelines.

## References

- Current behavior: [module runtime](../../packages/module/docs/runtime.md)
- Source: `packages/module/src/runtime/`
