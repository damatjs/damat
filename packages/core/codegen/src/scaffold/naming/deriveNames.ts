import type { TableSchema } from "@damatjs/orm-type";
import { toPascalCase } from './toPascalCase';
import { toCamelCaseCodeGen } from './toCamelCase';
import { CrudNames } from './type';

export function deriveNames(moduleId: string, table: TableSchema): CrudNames {
  const pascal = toPascalCase(table.name);
  // The table name, exactly as written, camelCased — used for BOTH the service
  // accessor (`service.<camel>`) and the route/workflow resource folder so they
  // stay identical. No pluralizing/singularizing.
  const camel = toCamelCaseCodeGen(table.name);
  const pk = table.columns.find((c) => c.primaryKey)?.name ?? "id";
  return {
    moduleId,
    table: table.name,
    prop: camel,
    fileBase: camel,
    pascal,
    pk,
    rowType: pascal,
    newType: `New${pascal}`,
    updateType: `Update${pascal}`,
    idType: `${pascal}Id`,
    queryType: `${pascal}Query`,
    paramsType: `${pascal}Params`,
    newSchema: `new${pascal}Schema`,
    updateSchema: `update${pascal}Schema`,
    querySchema: `${pascal}QuerySchema`,
    idSchema: `${pascal}IdSchema`,
    paramsSchema: `${pascal}ParamsSchema`,
  };
}
