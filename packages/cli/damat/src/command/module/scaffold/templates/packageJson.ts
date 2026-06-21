export function packageJsonTemplate(name: string): string {
  return `${JSON.stringify(
    {
      name: `@damatjs-modules/${name}`,
      version: "0.0.1",
      type: "module",
      private: true,
      scripts: {
        dev: "damat module dev",
        test: "bun test",
        typecheck: "tsc --noEmit",
        "migration:create": "damat module migration:create",
        codegen: "damat module codegen",
        validate: "damat module validate",
      },
      dependencies: {
        "@damatjs/module": "latest",
        "@damatjs/services": "latest",
        "@damatjs/framework": "latest",
        "@damatjs/orm-model": "latest",
        "@damatjs/workflow-engine": "latest",
        "@damatjs/deps": "latest",
      },
      devDependencies: {
        "@damatjs/damat-cli": "latest",
        "@types/bun": "latest",
        typescript: "^5.7.2",
      },
    },
    null,
    2,
  )}\n`;
}
