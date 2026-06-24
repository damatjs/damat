/**
 * The module's tsconfig. `paths` define the portable aliases so cross-tree
 * imports resolve identically standalone and after install:
 * - `@<id>/*` → the module's own `src/*` (types, service, lib, config, models)
 * - `@workflows` + `@workflows/*` → `src/workflows` / `src/workflows/*` (the
 *   move-out tree, named the same here and in a host backend). Generated routes
 *   import workflows from the bare barrel root `@workflows` (→ `src/workflows/index`,
 *   via the non-wildcard entry); workflow→step stays a relative `../steps` sibling.
 * The host backend mirrors these on `damat module add`.
 */
export function tsconfigTemplate(moduleId: string): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        lib: ["ES2023"],
        types: ["bun"],
        target: "ES2023",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        baseUrl: ".",
        paths: {
          [`@${moduleId}/*`]: ["./src/*"],
          "@workflows": ["./src/workflows"],
          "@workflows/*": ["./src/workflows/*"],
        },
      },
      include: ["src/**/*", "tests/**/*", "module.config.ts"],
    },
    null,
    2,
  )}\n`;
}