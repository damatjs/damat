# @damatjs/cli-kit Unreleased

## What changed

The framework-neutral `kit` command is now an independent capability. It keeps
local and Git sources, dry-run placement previews, safe editable-source copy,
install records, and optional package installation.

Manifest validation, planning, copying, and record updates are separated into
small single-purpose units.

## Breaking

- None for `damat` users; the executable composes this capability.

## Action required

Custom CLIs can compose `kitCliCapability` directly.
