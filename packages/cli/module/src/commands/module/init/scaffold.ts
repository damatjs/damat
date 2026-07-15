import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AGENTS_GUIDE } from "../scaffold/agents.generated";
import {
  configIndexTemplate,
  configLoadTemplate,
  configSchemaTemplate,
  contractTestTemplate,
  entryTemplate,
  envExampleTemplate,
  gitignoreTemplate,
  manifestTemplate,
  moduleConfigTemplate,
  packageJsonTemplate,
  readmeTemplate,
  serviceTemplate,
  toPascal,
  tsconfigTemplate,
} from "../scaffold/templates";

export function scaffoldModule(targetDir: string, name: string) {
  const serviceClass = `${toPascal(name)}Service`;
  const files: Record<string, string> = {
    "package.json": packageJsonTemplate(name),
    "tsconfig.json": tsconfigTemplate(name),
    "module.config.ts": moduleConfigTemplate(),
    ".env.example": envExampleTemplate(),
    ".gitignore": gitignoreTemplate(),
    "README.md": readmeTemplate(name),
    "src/module.json": manifestTemplate(name),
    "src/index.ts": entryTemplate(name, serviceClass),
    "src/service.ts": serviceTemplate(serviceClass),
    "src/config/schema/index.ts": configSchemaTemplate(),
    "src/config/load.ts": configLoadTemplate(),
    "src/config/index.ts": configIndexTemplate(),
    "tests/contract.test.ts": contractTestTemplate(name),
    "AGENTS.md": AGENTS_GUIDE,
  };
  for (const directory of [
    "src/models",
    "src/migrations",
    "src/workflows",
    "src/api/routes",
    "tests",
  ]) {
    mkdirSync(join(targetDir, directory), { recursive: true });
  }
  for (const [relative, content] of Object.entries(files)) {
    const path = join(targetDir, relative);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
  }
}
