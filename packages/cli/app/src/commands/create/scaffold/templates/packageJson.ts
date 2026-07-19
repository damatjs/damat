/**
 * The app's package.json. Dependency ranges are pinned to the CLI's own
 * version (caret) so a scaffolded app gets the same framework generation as
 * the CLI that created it — no "latest" drift between packages.
 */
export function packageJsonTemplate(name: string, version: string): string {
  const range = version === "latest" ? "latest" : `^${version}`;
  return `${JSON.stringify(
    {
      name,
      version: "0.0.1",
      type: "module",
      private: true,
      scripts: {
        dev: "bun run db:setup && damat dev",
        build: "damat build",
        start: "damat start",
        codegen: "damat codegen",
        "db:setup": "damat-orm database:setup",
        "db:migrate": "damat-orm migrate:up",
        "db:status": "damat-orm migrate:status",
        "db:create": "damat-orm migrate:create",
        test: "bun test",
        "test:watch": "bun test --watch",
        typecheck: "tsc --noEmit",
        clean: "rm -rf dist .damat",
      },
      engines: {
        bun: ">=1.1.0",
      },
      dependencies: {
        "@damatjs/damat-cli": range,
        "@damatjs/deps": range,
        "@damatjs/durability": range,
        "@damatjs/events": range,
        "@damatjs/framework": range,
        "@damatjs/jobs": range,
        "@damatjs/logger": range,
        "@damatjs/orm-cli": range,
        "@damatjs/orm-model": range,
        "@damatjs/orm-pg": range,
        "@damatjs/orm-processor": range,
        "@damatjs/pipelines": range,
        "@damatjs/services": range,
        "@damatjs/types": range,
        "@damatjs/workflow-engine": range,
      },
      devDependencies: {
        "@types/bun": "latest",
        typescript: "^5.7.2",
      },
    },
    null,
    2,
  )}\n`;
}
