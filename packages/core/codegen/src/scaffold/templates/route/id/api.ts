import type { CrudNames } from "../../../naming";
import { SCAFFOLD_NOTE } from '../../constant';

/** Single-resource route (`[id]`): GET one, PATCH update, DELETE. */
export function routeIdApi(n: CrudNames, wfDirSpec: string): string {
  return `${SCAFFOLD_NOTE}
import type { RouteHandler } from "@damatjs/framework/router";
import { find${n.pascal}Workflow } from "${wfDirSpec}/find${n.pascal}";
import { update${n.pascal}Workflow } from "${wfDirSpec}/update${n.pascal}";
import { delete${n.pascal}Workflow } from "${wfDirSpec}/delete${n.pascal}";

/** GET /${n.fileBase}/:${n.pk} — fetch one ${n.prop}. */
export const GET: RouteHandler = async (c) => {
  const ${n.pk} = c.req.param("${n.pk}");
  if (!${n.pk}) return c.json({ success: false, error: "missing ${n.pk}" }, 400);
  const result = await find${n.pascal}Workflow.execute(${n.pk});
  if (!result.success) {
    return c.json({ success: false, error: result.error?.message ?? "failed" }, 500);
  }
  if (!result.result) return c.json({ success: false, error: "not found" }, 404);
  return c.json({ success: true, data: result.result });
};

/** PATCH /${n.fileBase}/:${n.pk} — update one ${n.prop}. */
export const PATCH: RouteHandler = async (c) => {
  const ${n.pk} = c.req.param("${n.pk}");
  if (!${n.pk}) return c.json({ success: false, error: "missing ${n.pk}" }, 400);
  const data = await c.req.json();
  const result = await update${n.pascal}Workflow.execute({ ${n.pk}, data });
  if (!result.success) {
    return c.json({ success: false, error: result.error?.message ?? "failed" }, 500);
  }
  return c.json({ success: true, data: result.result });
};

/** DELETE /${n.fileBase}/:${n.pk} — delete one ${n.prop}. */
export const DELETE: RouteHandler = async (c) => {
  const ${n.pk} = c.req.param("${n.pk}");
  if (!${n.pk}) return c.json({ success: false, error: "missing ${n.pk}" }, 400);
  const result = await delete${n.pascal}Workflow.execute(${n.pk});
  if (!result.success) {
    return c.json({ success: false, error: result.error?.message ?? "failed" }, 500);
  }
  return c.json({ success: true, data: result.result });
};
`;
}
