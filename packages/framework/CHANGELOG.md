# @damatjs/framework

## 0.3.3

### Patch Changes

- Module scafolding and Codegen setup update
- Updated dependencies
  - @damatjs/logger@0.3.3
  - @damatjs/redis@0.3.3
  - @damatjs/types@0.3.3
  - @damatjs/deps@0.3.3
  - @damatjs/link@0.3.3
  - @damatjs/orm-connector@0.3.3
  - @damatjs/orm-type@0.3.3
  - @damatjs/services@0.3.3
  - @damatjs/workflow-engine@0.3.3

## 0.3.2

### Patch Changes

- Fixed the codegen cli issue and add clean up the workflow to allow yield based calls
- Updated dependencies
  - @damatjs/logger@0.3.2
  - @damatjs/redis@0.3.2
  - @damatjs/types@0.3.2
  - @damatjs/deps@0.3.2
  - @damatjs/link@0.3.2
  - @damatjs/orm-connector@0.3.2
  - @damatjs/orm-type@0.3.2
  - @damatjs/services@0.3.2
  - @damatjs/workflow-engine@0.3.2

## 0.3.1

### Patch Changes

- Introduces a new `reportError` utility function that provides structured, user-friendly error reporting in CLI commands. This replaces ad-hoc error message formatting throughout the codebase with a consistent approach that handles error causes, verbosity levels, and stack trace display.

  ## Key Changes
  - **New `reportError` utility** (`packages/core/cli/src/utils/output/reportError.ts`):
    - Formats errors with meaningful headlines (type name + message)
    - Walks error cause chains to surface root causes
    - Shows full stack traces only in verbose mode (via `--verbose` flag or `DAMAT_DEBUG=1`)
    - Displays a helpful hint pointing users to `--verbose` when not in verbose mode
    - Handles non-Error thrown values gracefully
  - **New helper functions**:
    - `isVerbose()`: Detects verbosity from command-line flags or environment variables
    - `getExitCode()`: Resolves process exit codes, respecting `CliError.exitCode` overrides
  - **Error handling improvements**:
    - Updated `ConfigLoadError` to use proper error `cause` chains instead of flattening messages
    - Modified error wrapping in `loadModules` and `loadDatabaseUrl` to preserve cause chains
    - Added try-catch blocks in `runCli` and `registerCommand` to catch unhandled command errors
    - Added last-resort error handlers in CLI entry points (`bin.ts`, `cli.ts`)
  - **Widespread adoption**:
    - Replaced manual error logging in 10+ command handlers with `reportError` calls
    - Updated migration commands (`up`, `status`, `create`, `list`) to use structured reporting
    - Updated code generation commands (`generate/types`, `module/codegen`, etc.)
    - Updated module commands (`add`, `validate`, `migrationCreate`)
  - **Test coverage**:
    - Added comprehensive test suite for `reportError`, `isVerbose`, and `getExitCode`
    - Updated existing error tests to reflect new cause-chain behavior

  ## Notable Implementation Details
  - Error cause chains are capped at 5 levels to prevent pathological/cyclic chains
  - The generic "Error" type name is omitted from headlines to reduce noise
  - Meaningful error type names (e.g., "ConfigError", "ValidationError") are surfaced
  - Stack traces are only shown when explicitly requested, keeping normal output clean
  - The `--verbose` flag is global and not part of command option definitions, so it's auto-detected rather than threaded through layers

- Updated dependencies
  - @damatjs/logger@0.3.1
  - @damatjs/redis@0.3.1
  - @damatjs/types@0.3.1
  - @damatjs/deps@0.3.1
  - @damatjs/link@0.3.1
  - @damatjs/orm-connector@0.3.1
  - @damatjs/orm-type@0.3.1
  - @damatjs/services@0.3.1
  - @damatjs/workflow-engine@0.3.1

## 0.3.0

### Minor Changes

- Lockstep release — version bump to keep every published `@damatjs/*` package on a single shared version. No change to this package's own code; see `@damatjs/services` / `@damatjs/orm-pg` for the actual `0.3.0` feature work.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @damatjs/logger@0.3.0
  - @damatjs/redis@0.3.0
  - @damatjs/types@0.3.0
  - @damatjs/deps@0.3.0
  - @damatjs/link@0.3.0
  - @damatjs/orm-connector@0.3.0
  - @damatjs/orm-type@0.3.0
  - @damatjs/workflow-engine@0.3.0
  - @damatjs/services@0.3.0

## 0.2.0

### Minor Changes

- - Strengthen module-authoring docs and fix the scaffolding CLIs end-to-end.

    **Docs & conventions** — drilled the core rules into `module`/`module-sample`, the scaffold `AGENTS.md`, the `damat-modules` skill, and the per-folder READMEs:
    - Codegen-first flow
    - One-way layering: route → workflow → step → service
    - No big files: `lib/` for integrations, `utils/` for helpers
    - Clear service/route boundaries

    **Scaffolding CLIs**
    - `damat module init` now emits a root `README.md` plus the full `AGENTS.md` guide. The guide is embedded as compiled code via `scripts/embedAgents.ts` (guarded by `prepublishOnly`) so it reliably ships in the published package.
    - Added a `defaultCommand` to the `@damatjs/cli` framework, so `create-damat-app <name>` works without typing `create`.
    - `create-damat-app --module` now scaffolds locally through `@damatjs/damat-cli module init` instead of cloning a missing remote starter repo. `--repo-url` still clones a custom one.
    - Corrected the `create-damat-app` README/docs and skill guidance to match.

### Patch Changes

- Updated dependencies
  - @damatjs/logger@0.2.0
  - @damatjs/redis@0.2.0
  - @damatjs/types@0.2.0
  - @damatjs/deps@0.2.0
  - @damatjs/link@0.2.0
  - @damatjs/orm-connector@0.2.0
  - @damatjs/orm-type@0.2.0
  - @damatjs/services@0.2.0
  - @damatjs/workflow-engine@0.2.0

## 0.1.4

### Patch Changes

- Strengthen module-authoring docs and fix the scaffolding CLIs end-to-end.

  **Docs & conventions** — drilled the core rules into `module`/`module-sample`, the scaffold `AGENTS.md`, the `damat-modules` skill, and the per-folder READMEs:
  - Codegen-first flow
  - One-way layering: route → workflow → step → service
  - No big files: `lib/` for integrations, `utils/` for helpers
  - Clear service/route boundaries

  **Scaffolding CLIs**
  - `damat module init` now emits a root `README.md` plus the full `AGENTS.md` guide. The guide is embedded as compiled code via `scripts/embedAgents.ts` (guarded by `prepublishOnly`) so it reliably ships in the published package.
  - Added a `defaultCommand` to the `@damatjs/cli` framework, so `create-damat-app <name>` works without typing `create`.
  - `create-damat-app --module` now scaffolds locally through `@damatjs/damat-cli module init` instead of cloning a missing remote starter repo. `--repo-url` still clones a custom one.
  - Corrected the `create-damat-app` README/docs and skill guidance to match.

- Updated dependencies
  - @damatjs/logger@0.1.4
  - @damatjs/redis@0.1.4
  - @damatjs/types@0.1.4
  - @damatjs/deps@0.1.4
  - @damatjs/link@0.1.4
  - @damatjs/orm-connector@0.1.4
  - @damatjs/orm-type@0.1.4
  - @damatjs/services@0.1.4
  - @damatjs/workflow-engine@0.1.4

## 0.1.3

### Patch Changes

- Add cross-module links (`@damatjs/link`). Declare a relationship between two
  models that live in different modules with `defineLink`, which generates a
  junction table that migrates and type-generates through the existing pipelines.
  At runtime, `getModule("link")` exposes `create`/`dismiss`/`fetch` and a nested
  `graph` query to traverse linked records across modules. Links live in
  `src/links/` and are wired in via a new `links` field in `damat.config.ts`; the
  framework boot and the `damat-orm` CLI both pick them up automatically.
- Updated dependencies
  - @damatjs/orm-type@0.1.3
  - @damatjs/link@0.1.3
  - @damatjs/logger@0.1.3
  - @damatjs/redis@0.1.3
  - @damatjs/types@0.1.3
  - @damatjs/deps@0.1.3
  - @damatjs/orm-connector@0.1.3
  - @damatjs/services@0.1.3
  - @damatjs/workflow-engine@0.1.3

## 0.1.2

### Patch Changes

- Added support for linking hasOne and belongsTo relations by table name, with foreign keys inferred by convention.
- Updated dependencies
  - @damatjs/logger@0.1.2
  - @damatjs/redis@0.1.2
  - @damatjs/types@0.1.2
  - @damatjs/deps@0.1.2
  - @damatjs/orm-connector@0.1.2
  - @damatjs/orm-type@0.1.2
  - @damatjs/services@0.1.2
  - @damatjs/workflow-engine@0.1.2

## 0.1.1

### Patch Changes

- minor clean up on ci and test
- Updated dependencies
  - @damatjs/logger@0.1.1
  - @damatjs/redis@0.1.1
  - @damatjs/types@0.1.1
  - @damatjs/deps@0.1.1
  - @damatjs/orm-connector@0.1.1
  - @damatjs/orm-type@0.1.1
  - @damatjs/services@0.1.1
  - @damatjs/workflow-engine@0.1.1

## 0.1.0

### Minor Changes

- Stabilized core functionality, expanded testing, and resolved known issues. Ready for minor release.

### Patch Changes

- Updated dependencies
  - @damatjs/workflow-engine@0.1.0
  - @damatjs/orm-connector@0.1.0
  - @damatjs/logger@0.1.0
  - @damatjs/redis@0.1.0
  - @damatjs/types@0.1.0
  - @damatjs/orm-type@0.1.0
  - @damatjs/services@0.1.0
  - @damatjs/deps@0.1.0

## 0.0.10

### Patch Changes

- fix: add tsc-alias to packages using @/ path aliases to ensure correct module resolution in published builds, and make inherited package configuration optional
- Updated dependencies
  - @damatjs/deps@0.0.10
  - @damatjs/logger@0.0.10
  - @damatjs/redis@0.0.10
  - @damatjs/types@0.0.10
  - @damatjs/orm-connector@0.0.10
  - @damatjs/orm-type@0.0.10
  - @damatjs/services@0.0.10
  - @damatjs/workflow-engine@0.0.10

## 0.0.9

### Patch Changes

- Fix: Add tsc-alias to all packages using @/ path aliases to ensure proper module resolution in published packages
- Updated dependencies
  - @damatjs/redis@0.0.9
  - @damatjs/services@0.0.9
  - @damatjs/logger@0.0.9
  - @damatjs/types@0.0.9
  - @damatjs/deps@0.0.9
  - @damatjs/orm-connector@0.0.9
  - @damatjs/orm-type@0.0.9
  - @damatjs/workflow-engine@0.0.9

## 0.0.8

### Patch Changes

- Fix: Update CI workflow to build nested packages and keep prepublishOnly check
- Updated dependencies
  - @damatjs/logger@0.0.8
  - @damatjs/redis@0.0.8
  - @damatjs/types@0.0.8
  - @damatjs/deps@0.0.8
  - @damatjs/orm-connector@0.0.8
  - @damatjs/orm-type@0.0.8
  - @damatjs/services@0.0.8
  - @damatjs/workflow-engine@0.0.8

## 0.0.7

### Patch Changes

- Build error fix ad syncing all to 0.0.7
- Updated dependencies
  - @damatjs/logger@0.0.7
  - @damatjs/redis@0.0.7
  - @damatjs/types@0.0.7
  - @damatjs/deps@0.0.7
  - @damatjs/orm-connector@0.0.7
  - @damatjs/orm-type@0.0.7
  - @damatjs/services@0.0.7
  - @damatjs/workflow-engine@0.0.7

## 0.0.6

### Patch Changes

- Fix: Include dist folder in published package - add prepublishOnly check to prevent publishing without built files
- Updated dependencies
  - @damatjs/logger@0.0.6
  - @damatjs/redis@0.0.6
  - @damatjs/types@0.0.6
  - @damatjs/deps@0.0.6
  - @damatjs/orm-connector@0.0.6
  - @damatjs/orm-type@0.0.6
  - @damatjs/services@0.0.6
  - @damatjs/workflow-engine@0.0.6

## 0.0.5

### Patch Changes

- no major change, fixed some of the build issue
- Updated dependencies
  - @damatjs/logger@0.0.5
  - @damatjs/redis@0.0.5
  - @damatjs/types@0.0.5
  - @damatjs/deps@0.0.5
  - @damatjs/orm-connector@0.0.5
  - @damatjs/orm-type@0.0.5
  - @damatjs/services@0.0.5
  - @damatjs/workflow-engine@0.0.5

## 0.0.4

### Patch Changes

- no major change, fixed some of the build issue
- Updated dependencies
  - @damatjs/logger@0.0.4
  - @damatjs/redis@0.0.4
  - @damatjs/types@0.0.4
  - @damatjs/deps@0.0.4
  - @damatjs/orm-connector@0.0.4
  - @damatjs/orm-type@0.0.4
  - @damatjs/services@0.0.4
  - @damatjs/workflow-engine@0.0.4

## 0.0.3

### Patch Changes

- no major change, fixed some of the build issue
- Updated dependencies
  - @damatjs/logger@0.0.3
  - @damatjs/redis@0.0.3
  - @damatjs/types@0.0.3
  - @damatjs/deps@0.0.3
  - @damatjs/orm-connector@0.0.3
  - @damatjs/orm-type@0.0.3
  - @damatjs/services@0.0.3
  - @damatjs/workflow-engine@0.0.3

## 0.0.2

### Patch Changes

- This is the first stable pre-alpha release of the project. All core features are implemented and working as expected, and the package is now functional end-to-end. However, it is not intended for production use at this stage. As a pre-alpha release, stability is not guaranteed, and users may encounter bugs, breaking changes, or unexpected behavior as the project continues to evolve. This version is primarily meant for early testing, feedback, and iterative improvement as the foundation for future stable releases.
- Updated dependencies
  - @damatjs/workflow-engine@0.0.2
  - @damatjs/orm-connector@0.0.2
  - @damatjs/redis@0.0.2
  - @damatjs/services@0.0.2
  - @damatjs/deps@0.0.2
  - @damatjs/logger@0.0.2
  - @damatjs/types@0.0.2
  - @damatjs/orm-type@0.0.2
