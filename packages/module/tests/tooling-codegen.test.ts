import { describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateModuleTypes } from "../src";

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as any;

// A real (tiny) model module, written into the throwaway module dir. codegen's
// discoverModels imports this and Object.values(models) feeds toModuleSchema.
// The tmp dir lives in os.tmpdir() (outside the package) so @damatjs/orm-model
// would not resolve by bare specifier there — import it by its resolved
// absolute path instead.
const ORM_MODEL = Bun.resolveSync("@damatjs/orm-model", import.meta.dir);
const MODEL_INDEX = `
import { model, columns } from ${JSON.stringify(ORM_MODEL)};

export const Category = model("category", {
  id: columns.id({ prefix: "cat" }).primaryKey(),
  name: columns.varchar().length(128),
});

export const models = { Category };
`;

/**
 * generateModuleTypes resolves the manifest paths and hands them to the shared
 * module-generator core, which only touches the filesystem (no DB). We point it
 * at a minimal module package with no models, so codegen discovers an empty
 * model set and writes the (empty) generated tree — exercising the full
 * manifest-resolution path in codegen.ts without a database.
 */
describe("generateModuleTypes", () => {
  test("resolves manifest paths and runs codegen against a model-less module", async () => {
    const pkg = mkdtempSync(join(tmpdir(), "damat-codegen-"));
    const src = join(pkg, "src");
    mkdirSync(src);
    writeFileSync(
      join(src, "module.json"),
      JSON.stringify({ name: "user", version: "1.0.0" }),
    );
    writeFileSync(join(src, "index.ts"), MODEL_INDEX);
    try {
      const result = await generateModuleTypes(pkg, noopLogger);
      expect(result).toBeDefined();
      // codegen writes its output under the resolved typesDir (default ./types)
      expect(existsSync(join(src, "types"))).toBe(true);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });

  test("honours a custom manifest paths.types directory", async () => {
    const pkg = mkdtempSync(join(tmpdir(), "damat-codegen-paths-"));
    const src = join(pkg, "src");
    mkdirSync(src);
    writeFileSync(
      join(src, "module.json"),
      JSON.stringify({
        name: "billing",
        version: "1.0.0",
        paths: { types: "generated", workflows: "flows" },
      }),
    );
    writeFileSync(join(src, "index.ts"), MODEL_INDEX);
    try {
      const result = await generateModuleTypes(pkg, noopLogger);
      expect(result).toBeDefined();
      expect(existsSync(join(src, "generated"))).toBe(true);
    } finally {
      rmSync(pkg, { recursive: true, force: true });
    }
  });
});
