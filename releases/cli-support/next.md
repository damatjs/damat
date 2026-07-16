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

## Breaking

- None — this is a new package.

## Action required

None for application users. CLI capability packages import these helpers.

## References

- Current behavior: [package README](../../packages/cli/support/README.md)
- Source: `packages/cli/support/src/`
