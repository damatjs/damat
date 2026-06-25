import { describe, it, expect } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ModuleSchema } from "@damatjs/orm-type";
import { generateCrudScaffold } from "../scaffold";

// A one-table schema is enough to exercise every specifier the scaffold emits.
const schema: ModuleSchema = {
  moduleName: "shop",
  tables: [
    {
      name: "widgets",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
      ],
    },
  ],
  enums: [],
  relationships: [],
};

function scaffoldInto(aliases?: { module: string; workflows: string }) {
  const root = mkdtempSync(join(tmpdir(), "cg-alias-"));
  generateCrudScaffold(schema, {
    moduleId: "shop",
    routesRoot: join(root, "api", "routes"),
    workflowsRoot: join(root, "workflows"),
    typesDir: join(root, "types"),
    ...(aliases ? { aliases } : {}),
  });
  const read = (rel: string) => readFileSync(join(root, rel), "utf-8");
  return { root, read };
}

describe("generateCrudScaffold — portable aliases", () => {
  const aliases = { module: "@shop", workflows: "@workflows" };

  it("steps import types via the bare @<module>/types alias", () => {
    const { read } = scaffoldInto(aliases);
    const step = read("workflows/widgets/steps/createWidgets.ts");
    // `@shop/types` resolves via `@shop/*` → `./src/types` → its index.ts.
    expect(step).toContain('from "@shop/types"');
    expect(step).not.toContain("../");
  });

  it("workflows import their step relatively (same <table> subtree) and types via @<module>", () => {
    const { read } = scaffoldInto(aliases);
    const wf = read("workflows/widgets/workflows/createWidgets.ts");
    // workflow → step is a sibling within the same <table> subtree, which
    // relocates together on install, so it stays relative — no module id baked in.
    expect(wf).toContain('from "@workflows"');
    expect(wf).toContain('from "@shop/types"');
  });

  it("routes import workflows from the bare @workflows barrel root; types via @<module>", () => {
    const { read } = scaffoldInto(aliases);
    const api = read("api/routes/widgets/api.ts");
    // route → workflow crosses trees (depth changes on install), so it goes
    // through the barrel root (`@workflows` → src/workflows/index via the
    // non-wildcard tsconfig entry), not a deep, module-id-bearing path.
    expect(api).toContain('from "@workflows"');
    expect(api).toContain("createWidgetsWorkflow");
    const validator = read("api/routes/widgets/validator.ts");
    expect(validator).toContain('from "@shop/types"');
    // [id] route is one level deeper but the barrel specifier is depth-independent.
    const idApi = read("api/routes/widgets/[id]/api.ts");
    expect(idApi).toContain('from "@workflows"');
    expect(idApi).not.toContain("../../");
  });

  it("without aliases, falls back to relative specifiers (regression)", () => {
    const { read } = scaffoldInto();
    const step = read("workflows/widgets/steps/createWidgets.ts");
    expect(step).toContain('from "../../../types/index"');
    const idApi = read("api/routes/widgets/[id]/api.ts");
    expect(idApi).toContain("../../../workflows");
    expect(idApi).not.toContain("@workflows");
  });
});
