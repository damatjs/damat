import { afterEach, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { runModuleCodegen } from "../commands/codegen/runModule";

let root = "";
const write = (path: string, value: string) => {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value);
};
const logger: any = {
  info() {},
  warn() {},
  error() {},
  success() {},
  debug() {},
};
afterEach(() => rmSync(root, { recursive: true, force: true }));

test("package codegen reads package models and writes app-owned output", async () => {
  root = mkdtempSync(join(tmpdir(), "damat-package-codegen-"));
  const packageRoot = join(root, "node_modules/@fixtures/billing");
  const ormModel = pathToFileURL(
    join(import.meta.dir, "../../../../orm/model/src/index.ts"),
  ).href;
  write(
    "node_modules/@fixtures/billing/src/index.ts",
    `
    const service = {};
    export default { service, init: () => service };
  `,
  );
  write(
    "node_modules/@fixtures/billing/src/models/invoice.ts",
    `
    import { model, columns } from "${ormModel}";
    export const Invoice = model("invoices", {
      id: columns.id().primaryKey()
    });
  `,
  );
  const moduleConfig = {
    resolve: packageRoot,
    entry: join(packageRoot, "src/index.ts"),
    models: join(packageRoot, "src/models"),
    mutable: false,
    packageName: "@fixtures/billing",
  };
  const outcome = await runModuleCodegen({
    modules: { billing: moduleConfig },
    moduleName: "billing",
    moduleConfig,
    cwd: root,
    flat: false,
    logger,
    strict: true,
  });
  const registry = readFileSync(
    join(root, "src/modules/billing/types/registry.ts"),
    "utf8",
  );
  expect(outcome).toBe("generated");
  expect(registry).toContain(
    'type BillingModule = typeof import("../../../../node_modules/@fixtures/billing/src/index").default;',
  );
  expect(registry).toContain('"billing": BillingModule["service"];');
  expect(
    readFileSync(join(root, "src/modules/billing/types/invoices.ts"), "utf8"),
  ).toContain("interface Invoices");
});
