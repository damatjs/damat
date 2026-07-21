import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateCrudScaffold } from "../../scaffold";
import { oneTableSchema, scaffoldOptions } from "../support/scaffoldFixture";

test("regeneration preserves a user-edited scaffold file", () => {
  const root = mkdtempSync(join(tmpdir(), "module-generator-"));
  const options = scaffoldOptions(root);
  const first = generateCrudScaffold(oneTableSchema, options);
  const edited = first.created.find((path) => path.endsWith("createUsers.ts"))!;
  writeFileSync(edited, "// user-owned\n", "utf8");
  const second = generateCrudScaffold(oneTableSchema, options);
  expect(readFileSync(edited, "utf8")).toBe("// user-owned\n");
  expect(second.skipped).toContain(edited);
});

test("regeneration skips every existing scaffold file", () => {
  const root = mkdtempSync(join(tmpdir(), "module-generator-"));
  const options = scaffoldOptions(root);
  const first = generateCrudScaffold(oneTableSchema, options);
  expect(first.created.length).toBeGreaterThan(0);
  expect(first.skipped.length).toBe(0);
  const second = generateCrudScaffold(oneTableSchema, options);
  expect(second.created.length).toBe(0);
  expect(second.skipped.length).toBe(first.created.length);
});
