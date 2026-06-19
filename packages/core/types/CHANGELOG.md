# @damatjs/types

## 0.1.3

### Patch Changes

- Add cross-module links (`@damatjs/link`). Declare a relationship between two
  models that live in different modules with `defineLink`, which generates a
  junction table that migrates and type-generates through the existing pipelines.
  At runtime, `getModule("link")` exposes `create`/`dismiss`/`fetch` and a nested
  `graph` query to traverse linked records across modules. Links live in
  `src/links/` and are wired in via a new `links` field in `damat.config.ts`; the
  framework boot and the `damat-orm` CLI both pick them up automatically.

## 0.1.2

### Patch Changes

- Added support for linking hasOne and belongsTo relations by table name, with foreign keys inferred by convention.

## 0.1.1

### Patch Changes

- minor clean up on ci and test

## 0.1.0

### Minor Changes

- Stabilized core functionality, expanded testing, and resolved known issues. Ready for minor release.

## 0.0.10

### Patch Changes

- fix: add tsc-alias to packages using @/ path aliases to ensure correct module resolution in published builds, and make inherited package configuration optional

## 0.0.9

### Patch Changes

- Fix: Add tsc-alias to all packages using @/ path aliases to ensure proper module resolution in published packages

## 0.0.8

### Patch Changes

- Fix: Update CI workflow to build nested packages and keep prepublishOnly check

## 0.0.7

### Patch Changes

- Build error fix ad syncing all to 0.0.7

## 0.0.6

### Patch Changes

- Fix: Include dist folder in published package - add prepublishOnly check to prevent publishing without built files

## 0.0.5

### Patch Changes

- no major change, fixed some of the build issue

## 0.0.4

### Patch Changes

- no major change, fixed some of the build issue

## 0.0.3

### Patch Changes

- no major change, fixed some of the build issue

## 0.0.2

### Patch Changes

- This is the first stable pre-alpha release of the project. All core features are implemented and working as expected, and the package is now functional end-to-end. However, it is not intended for production use at this stage. As a pre-alpha release, stability is not guaranteed, and users may encounter bugs, breaking changes, or unexpected behavior as the project continues to evolve. This version is primarily meant for early testing, feedback, and iterative improvement as the foundation for future stable releases.
