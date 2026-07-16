import type { ModuleSchema } from "@damatjs/orm-type";
import { join } from "node:path";
import type { CrudScaffoldOptions } from "../../scaffold";

export function schemaFor(name: string): ModuleSchema {
  return {
    moduleName: "shop",
    tables: [
      {
        name,
        columns: [
          { name: "id", type: "uuid", nullable: false, primaryKey: true },
          { name: "name", type: "text", nullable: false },
        ],
      },
    ],
    enums: [],
    relationships: [],
  };
}

export const oneTableSchema = schemaFor("users");

export function scaffoldOptions(root: string): CrudScaffoldOptions {
  return {
    moduleId: "shop",
    routesRoot: join(root, "api", "routes"),
    workflowsRoot: join(root, "workflows"),
    typesDir: join(root, "types"),
  };
}
