import type { CrudNames } from "../../../naming";
import { SCAFFOLD_NOTE } from '../../constant';

/** Single-resource route (`[id]`): GET one, PATCH update, DELETE. */
export function routeIdApi(n: CrudNames, wfDirSpec: string, typesSpec: string): string {
  return `${SCAFFOLD_NOTE}
import { getValidated, type RouteHandler } from "@damatjs/framework/router";
import { find${n.pascal}Workflow, update${n.pascal}Workflow, delete${n.pascal}Workflow } from "${wfDirSpec}";
import type { ${n.paramsType}, ${n.updateType} } from "${typesSpec}";

/** GET /${n.fileBase}/:id — fetch one ${n.prop}. */
export const GET: RouteHandler = async (c) => {
  // \`:id\` is already validated by the route's params validator.
  const { id } = getValidated<${n.paramsType}>(c, "params");
  const result = await find${n.pascal}Workflow.execute(id);
  if (!result.success) {
    return c.json({ success: false, error: result.error?.message ?? "failed" }, 500);
  }
  if (!result.result) return c.json({ success: false, error: "not found" }, 404);
  return c.json({ success: true, data: result.result });
};

/** PATCH /${n.fileBase}/:id — update one ${n.prop}. */
export const PATCH: RouteHandler = async (c) => {
  const { id } = getValidated<${n.paramsType}>(c, "params");
  const data = getValidated<${n.updateType}>(c, "body");
  const result = await update${n.pascal}Workflow.execute({ id, data });
  if (!result.success) {
    return c.json({ success: false, error: result.error?.message ?? "failed" }, 500);
  }
  return c.json({ success: true, data: result.result });
};

/** DELETE /${n.fileBase}/:id — delete one ${n.prop}. */
export const DELETE: RouteHandler = async (c) => {
  const { id } = getValidated<${n.paramsType}>(c, "params");
  const result = await delete${n.pascal}Workflow.execute(id);
  if (!result.success) {
    return c.json({ success: false, error: result.error?.message ?? "failed" }, 500);
  }
  return c.json({ success: true, data: result.result });
};
`;
}
