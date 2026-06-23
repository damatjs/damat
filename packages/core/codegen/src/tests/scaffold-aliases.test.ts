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

  it("steps import types via the @<module> alias", () => {
    const { read } = scaffoldInto(aliases);
    const step = read("workflows/widgets/steps/createWidgets.ts");
    expect(step).toContain('from "@shop/types/index"');
    expect(step).not.toContain("../");
  });

  it("workflows import steps + types via aliases (@workflows nested by module/table)", () => {
    const { read } = scaffoldInto(aliases);
    const wf = read("workflows/widgets/workflows/createWidgets.ts");
    expect(wf).toContain('from "@workflows/shop/widgets/steps/createWidgets"');
    expect(wf).toContain('from "@shop/types/index"');
    expect(wf).not.toContain("../");
  });

  it("routes import workflows via @workflows and types via @<module>", () => {
    const { read } = scaffoldInto(aliases);
    const api = read("api/routes/widgets/api.ts");
    expect(api).toContain('"@workflows/shop/widgets/workflows/createWidgets"');
    const validator = read("api/routes/widgets/validator.ts");
    expect(validator).toContain('from "@shop/types/index"');
    // [id] route is one level deeper but the alias is depth-independent.
    const idApi = read("api/routes/widgets/[id]/api.ts");
    expect(idApi).toContain('"@workflows/shop/widgets/workflows/findWidgets"');
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
