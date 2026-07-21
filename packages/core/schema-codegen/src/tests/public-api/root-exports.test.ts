import * as schemaCodegen from "../../index";
import { expect, test } from "bun:test";

{
  const rendererExports = [
    "generateEnumTypes",
    "generateEnumsFile",
    "getTableEnums",
    "generateNewType",
    "generateRowInterface",
    "generateUpdateType",
    "generateNewZodSchema",
    "generateUpdateZodSchema",
    "generateQueryZodSchema",
    "generateIdZodSchema",
    "generateParamsZodSchema",
  ] as const;

  test("exports the formerly public pure renderers from the package root", () => {
    for (const exportName of rendererExports) {
      expect(schemaCodegen[exportName]).toBeFunction();
    }
  });
}
