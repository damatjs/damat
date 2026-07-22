# Codegen CLI internals

The package adapts `@damatjs/module-generator` to a Damat application.
Eligibility, generation reporting, linked-field resolution, and file
augmentation are independent units. Pure schema rendering is owned by
`@damatjs/schema-codegen` and is consumed through the module generator. A
narrow tooling logger bridge keeps the public capability on the neutral
`CliLogger` contract.

Application module discovery uses the ORM config loader, which externalizes the
optional `pg-cloudflare` transport during config bundling. Codegen therefore
does not impose that dependency on consuming applications.

Characterization tests cover routing, one/all modes, failures, barrels, link
resolution, and generated link files. The capability test runs standalone
through `@damatjs/cli/testing`.
