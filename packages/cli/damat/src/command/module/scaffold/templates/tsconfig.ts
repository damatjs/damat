/**
 * The module's tsconfig. `paths` define the portable aliases so generated and
 * hand-written files never use relative `../../` chains:
 * - `@<id>/*` → the module's own `src/*` (types, service, lib, config, models)
 * - `@workflows/*` → `src/workflows/*` (the move-out tree, named the same here
 *   and in a host backend so the import survives install)
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
          "@workflows/*": ["./src/workflows/*"],
        },
      },
      include: ["src/**/*", "tests/**/*", "module.config.ts"],
    },
    null,
    2,
  )}\n`;
}