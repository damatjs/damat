import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ModuleSchema } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import { generateCrudScaffold } from "../scaffold";
import { runModuleCodegen } from "../run/runModuleCodegen";
import { runCodegen } from "../run/runCodegen";
import { tableToFileNameCodeGen } from "../scaffold/naming/tableToFileName";
import { toCamelCaseCodeGen } from "../scaffold/naming/toCamelCase";
import { registryAugmentation } from "../scaffold/registryAugmentation";
import { resolveServiceClassName } from "../scaffold/resolveServiceClassName";

// A silent logger so test output stays clean; it still satisfies ILogger.
const noop = () => {};
const quietLogger = {
  info: noop,
  warn: noop,
  error: noop,
  debug: noop,
  trace: noop,
  fatal: noop,
  child: () => quietLogger,
} as unknown as ILogger;

const schema: ModuleSchema = {
  moduleName: "shop",
  tables: [
    {
      name: "ai_sessions",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
      ],
    },
  ],
  enums: [{ name: "status", values: ["a", "b"] }],
  relationships: [],
};

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "cg-run-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function dirs() {
  return {
    typesDir: join(root, "types"),
    serviceDir: join(root, "service"),
    routesRoot: join(root, "api", "routes"),
    workflowsRoot: join(root, "workflows"),
  };
}

describe("runModuleCodegen", () => {
  it("writes type files, the registry, scaffolds CRUD and returns the result", async () => {
    const d = dirs();
    const result = await runModuleCodegen(
      { schema, moduleId: "shop", ...d },
      quietLogger,
    );

    // Type files + registry written into typesDir.
    expect(result.outputDir).toBe(d.typesDir);
    expect(result.files).toContain("registry.ts");
    expect(result.files).toContain("index.ts");
    expect(result.files).toContain("ai-sessions.ts");
    expect(existsSync(join(d.typesDir, "registry.ts"))).toBe(true);
    expect(existsSync(join(d.typesDir, "ai-sessions.ts"))).toBe(true);

    // Registry falls back to the convention name (no service.ts present).
    const registry = readFileSync(join(d.typesDir, "registry.ts"), "utf-8");
    expect(registry).toContain('"shop": ShopService');
    expect(registry).toContain('from "../service"');

    // CRUD scaffold created files under the workflow/route roots.
    expect(result.scaffolded.length).toBeGreaterThan(0);
    expect(
      existsSync(join(d.workflowsRoot, "aiSessions", "steps", "createAiSessions.ts")),
    ).toBe(true);
  });

  it("uses aliases for the registry service import when provided", async () => {
    const d = dirs();
    await runModuleCodegen(
      {
        schema,
        moduleId: "shop",
        ...d,
        aliases: { module: "@shop", workflows: "@workflows" },
      },
      quietLogger,
    );
    const registry = readFileSync(join(d.typesDir, "registry.ts"), "utf-8");
    expect(registry).toContain('from "@shop/service"');
  });

  it("invokes the augmentFilesMap hook before writing files", async () => {
    const d = dirs();
    let seen = false;
    await runModuleCodegen(
      {
        schema,
        moduleId: "shop",
        ...d,
        augmentFilesMap: (filesMap) => {
          seen = true;
          filesMap.set("extra.ts", "// extra\n");
        },
      },
      quietLogger,
    );
    expect(seen).toBe(true);
    expect(existsSync(join(d.typesDir, "extra.ts"))).toBe(true);
  });

  it("resolves the service class from an existing service.ts", async () => {
    const d = dirs();
    mkdirSync(d.serviceDir, { recursive: true });
    writeFileSync(
      join(d.serviceDir, "service.ts"),
      `export class WidgetService extends ModuleService("shop") {}`,
    );
    await runModuleCodegen({ schema, moduleId: "shop", ...d }, quietLogger);
    const registry = readFileSync(join(d.typesDir, "registry.ts"), "utf-8");
    expect(registry).toContain('"shop": WidgetService');
  });

  it("defaults to getLogger() when no logger is passed", async () => {
    const d = dirs();
    const result = await runModuleCodegen({ schema, moduleId: "shop", ...d });
    expect(result.files).toContain("registry.ts");
  });

  it("swallows a CRUD scaffold failure without losing the types/registry", async () => {
    const d = dirs();
    // Force generateCrudScaffold to throw: make routesRoot a FILE so mkdirSync
    // under it fails (ENOTDIR) when it tries to create a resource subfolder.
    mkdirSync(join(root, "api"), { recursive: true });
    writeFileSync(d.routesRoot, "not a dir");
    const result = await runModuleCodegen(
      { schema, moduleId: "shop", ...d },
      quietLogger,
    );
    // Types + registry still written even though scaffold/barrels failed.
    expect(result.files).toContain("registry.ts");
    expect(existsSync(join(d.typesDir, "registry.ts"))).toBe(true);
  });

  it("swallows a barrel-generation failure", async () => {
    const d = dirs();
    // Let the scaffold succeed, but plant a directory named `index.ts` inside the
    // workflow tree so generateBarrels' writeFileSync(index.ts) throws (EISDIR),
    // which runModuleCodegen must catch and log without failing the run.
    mkdirSync(join(d.workflowsRoot, "ai_planted", "index.ts"), { recursive: true });
    const result = await runModuleCodegen(
      { schema, moduleId: "shop", ...d },
      quietLogger,
    );
    expect(result.files).toContain("registry.ts");
  });
});

// Absolute specifier to @damatjs/orm-model, resolved from THIS test file (which
// can see the package's node_modules) so the tmp-dir fixture can import it.
const ormModelEntry = Bun.resolveSync("@damatjs/orm-model", import.meta.dir);

describe("runCodegen", () => {
  // Build a real module dir exporting `models` (model/columns) and run codegen
  // against it through the dir-driven convenience wrapper.
  function writeModelsModule(): string {
    // Named `__fixtures__` so the generated module file matches the bunfig
    // coveragePathIgnorePatterns (`**/__fixtures__/**`) — it is test scaffolding,
    // not package source, so it must not count toward coverage.
    const dir = join(root, "__fixtures__", "module");
    mkdirSync(dir, { recursive: true });
    // `discoverModels` does a bare `import(moduleResolver)`; from a tmp dir the
    // bare `@damatjs/orm-model` specifier is unresolvable, so the fixture imports
    // model/columns from this test module's own resolution (re-exported below).
    writeFileSync(
      join(dir, "index.ts"),
      `import { model, columns } from ${JSON.stringify(ormModelEntry)};
export const models = {
  Widget: model("widgets", {
    id: columns.id().primaryKey(),
    name: columns.text(),
  }),
};
`,
    );
    return dir;
  }

  it("discovers models, builds the schema and runs the shared codegen", async () => {
    const d = dirs();
    const moduleResolver = writeModelsModule();
    const result = await runCodegen(
      { moduleResolver, moduleId: "shop", ...d },
      quietLogger,
    );
    expect(result.outputDir).toBe(d.typesDir);
    expect(result.files).toContain("registry.ts");
    expect(existsSync(join(d.typesDir, "widgets.ts"))).toBe(true);
  });
});

describe("generateCrudScaffold — scaffold-once skip", () => {
  it("skips files that already exist on a second run", () => {
    const d = dirs();
    const opts = {
      moduleId: "shop",
      routesRoot: d.routesRoot,
      workflowsRoot: d.workflowsRoot,
      typesDir: d.typesDir,
    };
    const first = generateCrudScaffold(schema, opts, quietLogger);
    expect(first.created.length).toBeGreaterThan(0);
    expect(first.skipped.length).toBe(0);

    // Second run: every file already exists → all skipped, none created.
    const second = generateCrudScaffold(schema, opts, quietLogger);
    expect(second.created.length).toBe(0);
    expect(second.skipped.length).toBe(first.created.length);
  });
});

describe("naming helpers", () => {
  it("tableToFileNameCodeGen turns underscores into dashes", () => {
    expect(tableToFileNameCodeGen("ai_sessions")).toBe("ai-sessions");
    expect(tableToFileNameCodeGen("accounts")).toBe("accounts");
    expect(tableToFileNameCodeGen("order_line_items")).toBe("order-line-items");
  });

  it("toCamelCaseCodeGen camelCases multi-segment names (upper-casing later parts)", () => {
    expect(toCamelCaseCodeGen("ai_sessions")).toBe("aiSessions");
    expect(toCamelCaseCodeGen("order-line-items")).toBe("orderLineItems");
    expect(toCamelCaseCodeGen("multi word name")).toBe("multiWordName");
    expect(toCamelCaseCodeGen("accounts")).toBe("accounts");
  });
});

describe("registryAugmentation", () => {
  it("emits the ModuleRegistry augmentation with the default relative import", () => {
    const out = registryAugmentation("blog", "BlogService");
    expect(out).toContain('import type { BlogService } from "../service";');
    expect(out).toContain('declare module "@damatjs/services"');
    expect(out).toContain('"blog": BlogService;');
  });

  it("honours a custom service import specifier", () => {
    const out = registryAugmentation("blog", "BlogService", "@blog/service");
    expect(out).toContain('from "@blog/service"');
  });
});

describe("resolveServiceClassName", () => {
  it("extracts the class name from service.ts", () => {
    const dir = mkdtempSync(join(tmpdir(), "cg-svc-"));
    writeFileSync(
      join(dir, "service.ts"),
      `export class AcmeService extends ModuleService("acme") {}`,
    );
    expect(resolveServiceClassName(dir, "acme")).toBe("AcmeService");
    rmSync(dir, { recursive: true, force: true });
  });

  it("falls back to the PascalCase convention when service.ts is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "cg-svc-"));
    expect(resolveServiceClassName(dir, "my_module")).toBe("MyModuleService");
    rmSync(dir, { recursive: true, force: true });
  });

  it("falls back when the file exists but has no matching class declaration", () => {
    const dir = mkdtempSync(join(tmpdir(), "cg-svc-"));
    writeFileSync(join(dir, "service.ts"), `// no service class here\n`);
    expect(resolveServiceClassName(dir, "billing")).toBe("BillingService");
    rmSync(dir, { recursive: true, force: true });
  });
});
