# Codegen CLI internals

The package adapts the framework-neutral `@damatjs/codegen` engine to a Damat
application. Eligibility, generation reporting, linked-field resolution, and
file augmentation are independent units. A narrow tooling logger bridge keeps
the public capability on the neutral `CliLogger` contract.

Characterization tests cover routing, one/all modes, failures, barrels, link
resolution, and generated link files. The capability test runs standalone
through `@damatjs/cli/testing`.
