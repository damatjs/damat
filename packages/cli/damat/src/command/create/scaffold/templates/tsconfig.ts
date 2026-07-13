/**
 * The app's tsconfig. Standalone (no `extends` — @damatjs/typescript-config is
 * not published), mirroring the compiler settings the framework packages are
 * built against. The `@workflows` aliases are the app-level entries `damat
 * module add` otherwise writes on first install; `@<id>/*` aliases are added
 * per module by the installer.
 */
export function tsconfigTemplate(): string {
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
          "@/*": ["./src/*"],
          "@workflows": ["./src/workflows"],
          "@workflows/*": ["./src/workflows/*"],
        },
      },
      include: ["src/**/*", "tests/**/*", "damat.config.ts"],
    },
    null,
    2,
  )}\n`;
}
