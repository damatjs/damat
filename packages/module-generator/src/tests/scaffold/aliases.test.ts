import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateCrudScaffold } from "../../scaffold";
import {
  tableToFileNameCodeGen,
  toCamelCaseCodeGen,
} from "../../scaffold/naming";
import { scaffoldOptions, schemaFor } from "../support/scaffoldFixture";

function scaffold(aliases?: { module: string; workflows: string }) {
  const root = mkdtempSync(join(tmpdir(), "module-generator-alias-"));
  generateCrudScaffold(schemaFor("widgets"), {
    ...scaffoldOptions(root),
    ...(aliases ? { aliases } : {}),
  });
  return (path: string) => readFileSync(join(root, path), "utf8");
}

const aliases = { module: "@shop", workflows: "@workflows" };

test("steps import types through the module alias", () => {
  const read = scaffold(aliases);
  const step = read("workflows/widgets/steps/createWidgets.ts");
  expect(step).toContain('from "@shop/types"');
  expect(step).not.toContain("../");
});

test("workflows use portable step and type imports", () => {
  const read = scaffold(aliases);
  const workflow = read("workflows/widgets/workflows/createWidgets.ts");
  expect(workflow).toContain('from "@workflows"');
  expect(workflow).toContain('from "@shop/types"');
});

test("collection and id routes use depth-independent aliases", () => {
  const read = scaffold(aliases);
  const api = read("api/routes/widgets/api.ts");
  expect(api).toContain('from "@workflows"');
  expect(api).toContain("createWidgetsWorkflow");
  expect(read("api/routes/widgets/validator.ts")).toContain(
    'from "@shop/types"',
  );
  const idApi = read("api/routes/widgets/[id]/api.ts");
  expect(idApi).toContain('from "@workflows"');
  expect(idApi).not.toContain("../../");
});

test("falls back to relative imports without aliases", () => {
  const read = scaffold();
  expect(read("workflows/widgets/steps/createWidgets.ts")).toContain(
    'from "../../../types/index"',
  );
  const idApi = read("api/routes/widgets/[id]/api.ts");
  expect(idApi).toContain("../../../workflows");
  expect(idApi).not.toContain("@workflows");
});

test("scaffold naming preserves table words without pluralization", () => {
  expect(tableToFileNameCodeGen("ai_sessions")).toBe("ai-sessions");
  expect(tableToFileNameCodeGen("accounts")).toBe("accounts");
  expect(tableToFileNameCodeGen("order_line_items")).toBe("order-line-items");
  expect(toCamelCaseCodeGen("ai_sessions")).toBe("aiSessions");
  expect(toCamelCaseCodeGen("order-line-items")).toBe("orderLineItems");
  expect(toCamelCaseCodeGen("multi word name")).toBe("multiWordName");
  expect(toCamelCaseCodeGen("accounts")).toBe("accounts");
});
