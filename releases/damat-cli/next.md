# Unreleased

## Changed

`@damatjs/damat-cli` is now a thin executable composer. App, codegen, module,
kit, and auth handlers are owned and tested by standalone capability packages.
The top-level command order and behavior remain compatible.
The generated executable version is now checked against the package version in
the canonical test suite.

## Action required

There is no action for CLI users. Code importing handler internals from the
executable package should import the owning capability package instead.
