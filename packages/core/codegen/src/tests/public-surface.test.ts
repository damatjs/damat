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

const generatorExports = [
  "runCodegen",
  "runModuleCodegen",
  "generateCrudScaffold",
  "generateBarrels",
  "registryAugmentation",
  "registryModuleAugmentation",
] as const;

test("re-exports both replacement package surfaces", () => {
  for (const exportName of [...rendererExports, ...generatorExports]) {
    expect(codegen[exportName]).toBeFunction();
  }
});
