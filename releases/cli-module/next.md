# Unreleased

## Changed

Module and auth command implementations now live in `@damatjs/cli-module` and
export separate capabilities. Existing command names, options, outputs, source
support, trust gates, and installation layouts are preserved.

## Action required

Custom CLI composers should import these capabilities from
`@damatjs/cli-module`. Users of the `damat` executable need no command changes.
