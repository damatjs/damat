import { join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import type { Command } from "@damatjs/cli";
import {
  packageJsonTemplate,
  tsconfigTemplate,
  manifestTemplate,
  moduleConfigTemplate,
  entryTemplate,
  serviceTemplate,
  configSchemaTemplate,
  configLoadTemplate,
  configIndexTemplate,
  contractTestTemplate,
  envExampleTemplate,
  gitignoreTemplate,
  toPascal,
} from "./scaffold/templates";

const MODULE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export const moduleInitCommand: Command = {
  name: "init",
  description: "Scaffold a new standalone module package",
  usage: "damat module init <name> [--dir <path>]",
  options: [
    {
      name: "dir",
      alias: "d",
      type: "string",
      description: "Directory to create the package in (default: ./<name>)",
    },
  ],
  handler: async (ctx) => {
    const name = ctx.args[0];
    if (!name || !MODULE_NAME_PATTERN.test(name)) {
      ctx.logger.error(
        "Usage: damat module init <name>   (kebab-case, e.g. user-management)",
      );
      return { exitCode: 1 };
    }

    const targetDir = join(ctx.cwd, (ctx.options.dir as string) || name);
    if (existsSync(targetDir)) {
      ctx.logger.error(`${targetDir} already exists`);
      return { exitCode: 1 };
    }

    const serviceClass = `${toPascal(name)}Service`;
    const src = join(targetDir, "src");

    const files: Record<string, string> = {
      "package.json": packageJsonTemplate(name),
      "tsconfig.json": tsconfigTemplate(),
      "module.config.ts": moduleConfigTemplate(),
      ".env.example": envExampleTemplate(),
      ".gitignore": gitignoreTemplate(),
      "src/module.json": manifestTemplate(name),
      "src/index.ts": entryTemplate(name, serviceClass),
      "src/service.ts": serviceTemplate(serviceClass),
      "src/config/schema/index.ts": configSchemaTemplate(),
      "src/config/load.ts": configLoadTemplate(),
      "src/config/index.ts": configIndexTemplate(),
      "tests/contract.test.ts": contractTestTemplate(name),
    };

    for (const dir of ["src/models", "src/migrations", "src/workflows", "src/api/routes"]) {
      mkdirSync(join(targetDir, dir), { recursive: true });
    }
    mkdirSync(join(src, "config", "schema"), { recursive: true });
    mkdirSync(join(targetDir, "tests"), { recursive: true });

    for (const [relPath, content] of Object.entries(files)) {
      const fullPath = join(targetDir, relPath);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, content);
    }

    ctx.logger.success(`Module package created at ${targetDir}`);
    ctx.logger.info(
      [
        "Next steps:",
        `  cd ${name} && bun install`,
        "  # add models in src/models, service logic in src/service.ts",
        "  bun run migration:create   # generate the schema migration",
        "  bun run codegen            # generate row types + zod schemas",
        "  bun run dev                # run the module standalone",
        "  bun test                   # contract + service + api tests",
      ].join("\n"),
    );
    return { exitCode: 0 };
  },
};
