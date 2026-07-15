# Module CLI internals

The package exports two capabilities so a composer can position `module` and
`auth` independently. Command metadata, handlers, trust decisions, planning,
filesystem work, and network work are separated into small named files.

Shared module helpers are grouped by config parsing, copy layout, source
resolution, dependency safety, environment synchronization, and path guards.
The test harness uses mutable mock state with a reset hook registered by every
small test file, preventing state leakage while keeping all characterization
coverage.

`scripts/embedAgents.ts` embeds the scaffold guide before build.
`scripts/verify-link-split.ts` performs the real-filesystem link-layout check.
