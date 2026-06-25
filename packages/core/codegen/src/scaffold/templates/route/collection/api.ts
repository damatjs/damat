import type { CrudNames } from "../../../naming";
import { SCAFFOLD_NOTE } from '../../constant';

/** Collection route `GET` (list) + `POST` (create) handlers. */
export function routeCollectionApi(n: CrudNames, wfDirSpec: string, typesSpec: string): string {
  return `${SCAFFOLD_NOTE}
import { getValidated, type RouteHandler } from "@damatjs/framework/router";
import { create${n.pascal}Workflow, findMany${n.pascal}Workflow } from "${wfDirSpec}";
import type { ${n.newType} } from "${typesSpec}";
import type { ${n.queryType} } from "./query";

/** GET /${n.fileBase} — list ${n.prop}. */
export const GET: RouteHandler = async (c) => {
  // Already validated + coerced by the route's query validator.
  const query = getValidated<${n.queryType}>(c, "query");
  const result = await findMany${n.pascal}Workflow.execute(query);
  if (!result.success) {
    return c.json({ success: false, error: result.error?.message ?? "failed" }, 500);
  }
  return c.json({ success: true, data: result.result });
};

/** POST /${n.fileBase} — create ${n.prop}. */
export const POST: RouteHandler = async (c) => {
  // Already validated by the route's body validator.
  const body = getValidated<${n.newType}>(c, "body");
  const result = await create${n.pascal}Workflow.execute(body);
  if (!result.success) {
    return c.json({ success: false, error: result.error?.message ?? "failed" }, 500);
  }
  return c.json({ success: true, data: result.result }, 201);
};
`;
}
