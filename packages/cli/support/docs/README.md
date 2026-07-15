# CLI support internals

| Area                   | Responsibility                                    |
| ---------------------- | ------------------------------------------------- |
| `cleanupTempFile.ts`   | Best-effort removal with debug diagnostics.       |
| `git.ts`               | Detect system Git and produce actionable errors.  |
| `gitSource.ts`         | Parse Git URLs and GitHub source shorthand.       |
| `runTypeCheck.ts`      | Run `bunx tsc --noEmit` with explicit inputs.     |
| `packages/validate.ts` | Validate package names and ranges.                |
| `packages/install.ts`  | Build safe `bun add` arguments and return output. |

The package is a leaf above `@damatjs/cli`. App, kit, and module capabilities
may depend on it, but it never imports those packages or the composer.
