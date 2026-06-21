

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
      },
      include: ["src/**/*", "tests/**/*", "module.config.ts"],
    },
    null,
    2,
  )}\n`;
}