# CLI support internals

| Area                    | Responsibility                                                    |
| ----------------------- | ----------------------------------------------------------------- |
| `cleanupTempFile.ts`    | Best-effort removal with debug diagnostics.                       |
| `git.ts`                | Detect system Git and produce actionable errors.                  |
| `gitSource.ts`          | Parse Git URLs and GitHub source shorthand.                       |
| `runTypeCheck.ts`       | Run `bun x tsc --noEmit` through the active Bun executable.       |
| `packages/validate.ts`  | Validate package names and ranges.                                |
| `packages/install.ts`   | Build safe `bun add` arguments and return output.                 |
| `installer/origin.ts`   | Parse paths, Git, registry, npm, and tarball arguments.           |
| `installer/registry.ts` | Resolve configured registry indexes to trusted origins.           |
| `installer/runtime.ts`  | Adapt CLI logging, flags, commands, and fetch to installer ports. |
| `installer/options.ts`  | Parse mode, backend, and capability destination overrides.        |

The package is a leaf above `@damatjs/cli`. App, kit, and module capabilities
may depend on it, but it never imports those packages or the composer.
