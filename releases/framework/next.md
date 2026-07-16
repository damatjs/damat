# @damatjs/framework Unreleased

## Changed

Module `resolve` locations may now be a source path, a Node package descriptor,
or a Damat package-store descriptor. Damat package paths are constrained to the
application's `.damat/packages` directory before dynamic import.

## Action required

None for source-path users. Package-mode users should treat both backends as
early alpha and keep explicit installation records.
