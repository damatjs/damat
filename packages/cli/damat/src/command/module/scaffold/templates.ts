/**
 * File templates for `damat module init`. The scaffold gives authors a
 * complete, runnable module package — they only fill in models, service
 * logic, and module.config.ts.
 */

export function packageJsonTemplate(name: string): string {
  return `${JSON.stringify(
    {
      name: `@modules/${name}`,
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

export function manifestTemplate(name: string): string {
  return `${JSON.stringify(
    {
      name,
      version: "0.0.1",
      description: `${name} module`,
      registry: { namespace: "", license: "MIT", keywords: [] },
      env: [],
      modules: [],
      paths: {
        entry: "./index.ts",
        models: "./models",
        migrations: "./migrations",
        workflows: "./workflows",
        types: "./types",
      },
    },
    null,
    2,
  )}\n`;
}

export function moduleConfigTemplate(): string {
  return `import { defineModuleConfig } from "@damatjs/module";

// The only module-custom setup. Everything else (server, db wiring,
// migrations, tests) is provided by the module runtime.
export default defineModuleConfig({
  projectConfig: {
    // http: { port: 7654 },
  },
});
`;
}

export function entryTemplate(name: string, serviceClass: string): string {
  return `import { defineModule } from "@damatjs/module";
import { ${serviceClass}, models } from "./service";
import credentials from "./config";

export const MODULE_ID = "${name}";

export { ${serviceClass}, models };

declare module "@damatjs/services" {
  interface ModuleRegistry {
    "${name}": ${serviceClass};
  }
}

export default defineModule(MODULE_ID, {
  service: ${serviceClass},
  credentials: credentials.load,
});
`;
}

export function serviceTemplate(serviceClass: string): string {
  return `import { ModuleService } from "@damatjs/module";
import { schema } from "./config/schema";

export const models = {
  // example: columns.id() based models registered here
};

export class ${serviceClass} extends ModuleService({
  models,
  credentialsSchema: schema,
}) {}
`;
}

export function accessorTemplate(name: string, serviceClass: string): string {
  return `import { getModule } from "@damatjs/module";
import type { ${serviceClass} } from "./service";

export function ${toCamel(name)}Service(): ${serviceClass} {
  const service = getModule("${name}") as ${serviceClass} | null;
  if (!service) throw new Error("${name} module not loaded");
  return service;
}
`;
}

export function configSchemaTemplate(): string {
  return `import { z } from "@damatjs/module";

export const schema = z.object({});

export type schemaType = z.infer<typeof schema>;
`;
}

export function configLoadTemplate(): string {
  return `export const load = (_env: NodeJS.ProcessEnv) => ({});
`;
}

export function configIndexTemplate(): string {
  return `import { schema } from "./schema";
import { load } from "./load";

export default {
  schema,
  load,
};
`;
}

export function contractTestTemplate(name: string): string {
  return `import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { validateModuleDir } from "@damatjs/module";

describe("${name} module contract", () => {
  test("module directory passes validation", () => {
    const report = validateModuleDir(join(import.meta.dir, "../src"));
    expect(report.errors).toEqual([]);
    expect(report.valid).toBe(true);
  });
});
`;
}

export function envExampleTemplate(): string {
  return `DATABASE_URL=postgres://localhost:5432/postgres\n`;
}

export function gitignoreTemplate(): string {
  return `node_modules\n.damat\n.env\n*.tsbuildinfo\n`;
}

export function toCamel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

export function toPascal(name: string): string {
  const camel = toCamel(name);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}
