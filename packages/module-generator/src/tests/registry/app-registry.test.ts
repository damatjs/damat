import { expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { registryAugmentation, resolveServiceClassName } from "../../registry";

test("renders an app registry with the default service import", () => {
  const output = registryAugmentation("blog", "BlogService");
  expect(output).toContain('import type { BlogService } from "../service";');
  expect(output).toContain('declare module "@damatjs/services"');
  expect(output).toContain('"blog": BlogService;');
});

test("renders an app registry with a custom service import", () => {
  const output = registryAugmentation("blog", "BlogService", "@blog/service");
  expect(output).toContain('from "@blog/service"');
});

test("resolves a service class from service.ts", () => {
  const root = mkdtempSync(join(tmpdir(), "module-generator-service-"));
  writeFileSync(
    join(root, "service.ts"),
    `export class AcmeService extends ModuleService("acme") {}`,
  );
  expect(resolveServiceClassName(root, "acme")).toBe("AcmeService");
  rmSync(root, { recursive: true, force: true });
});

test("falls back when service.ts is missing or has no service class", () => {
  const root = mkdtempSync(join(tmpdir(), "module-generator-service-"));
  expect(resolveServiceClassName(root, "my_module")).toBe("MyModuleService");
  writeFileSync(join(root, "service.ts"), "// no service class here\n");
  expect(resolveServiceClassName(root, "billing")).toBe("BillingService");
  rmSync(root, { recursive: true, force: true });
});
