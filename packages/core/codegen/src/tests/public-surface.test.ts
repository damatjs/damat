import { expect, test } from "bun:test";
import * as codegen from "../index";

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

test("re-exports the pure renderer surface from schema-codegen", () => {
  for (const exportName of rendererExports) {
    expect(codegen[exportName]).toBeFunction();
  }
});
