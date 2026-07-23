# @damatjs/durability

## 1.0.3

### Patch Changes

- @damatjs/deps@1.0.3

## 1.0.2

### Patch Changes

- Fixed
  - Real terminal Ctrl-C now drains workers and records stopping_at/stopped_at.
  - MCP bare names resolve unique namespaced modules and report ambiguity.
  - Global --verbose works before or after module commands and exposes stack traces.
  - Fixed the Bun/Playwright compatibility issue
- Updated dependencies
  - @damatjs/deps@1.0.2

## 1.0.1

### Patch Changes

- bug fixes and small patches
- Updated dependencies
  - @damatjs/deps@1.0.1

## 1.0.0

### Major Changes

- 8011ac8: Prepare Damat's early-launch beta: the shared package line graduates to the v1
  contract around composable modules, PostgreSQL-canonical durable execution,
  optional Redis acceleration, split CLI capabilities, transactional installs,
  ModuleService-based provider standards, and production deployment gates.

### Patch Changes

- Updated dependencies [8011ac8]
  - @damatjs/deps@1.0.0

## 1.0.0-beta.0

### Major Changes

- Prepare Damat's early-launch beta: the shared package line graduates to the v1
  contract around composable modules, PostgreSQL-canonical durable execution,
  optional Redis acceleration, split CLI capabilities, transactional installs,
  standardized provider capabilities, and production deployment gates.

### Patch Changes

- Updated dependencies
  - @damatjs/deps@1.0.0-beta.0
