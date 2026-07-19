# @damatjs/cli-support Unreleased

> Introduces the shared Damat-specific support layer used by CLI capability
> packages.

## What changed

Git detection, type-check execution, temporary-file cleanup, package-spec
validation, and Bun package installation now have a dependency-neutral home
outside the executable composer.

## Added

- Structural `CliLogger` inputs.
- Safe package name/range validation and script-disabled installation defaults.
- Explicit rejection of package names beginning with a command-line flag.
- Shared Git URL and GitHub shorthand parsing for source-based capabilities.
- Universal artifact origin parsing for local paths, file URLs, Git, GitHub,
  registry refs, npm refs, and tarballs.
- Generic registry resolution using `DAMAT_REGISTRY` or the compatible
  `DAMAT_MODULE_REGISTRY` setting.
- Shared adapters that connect CLI options, logging, acquisition, planning, and
  transactional execution to `@damatjs/installer`.
- Type-check subprocesses launch through Bun's absolute running executable, so
  builds do not depend on a separate `bunx` command being present in `PATH`.
- Shared PostgreSQL command options, URL validation/building, and interactive
  collection. Full URLs and passwords use a non-echoing terminal prompt.
- Noninteractive callers can pass a full URL or connection fields, and can
  explicitly defer provisioning without a hanging prompt.

## Fixed

- Type-check subprocesses now resolve `Bun.spawn` when invoked, so package test
  doubles remain reliable regardless of module discovery order or platform.

## Breaking

- None — this is a new package.

## Action required

None for application users. CLI capability packages import these helpers.

## References

- Current behavior: [package README](../../packages/cli/support/README.md)
- Source: `packages/cli/support/src/`
