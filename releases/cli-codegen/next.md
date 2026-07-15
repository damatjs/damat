# Unreleased

## Changed

The `codegen` and `barrel` commands now live in `@damatjs/cli-codegen`. Link
resolution and generated-file augmentation are separate internal units.

## Action required

Custom composers should import `codegenCliCapability`. The `damat` command
surface is unchanged.
