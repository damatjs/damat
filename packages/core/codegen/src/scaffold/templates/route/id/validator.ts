import type { CrudNames } from "../../../naming";
import { SCAFFOLD_NOTE } from '../../constant';

export function routeIdValidator(n: CrudNames, typesSpec: string): string {
  return `${SCAFFOLD_NOTE}
import type { RouteValidator } from "@damatjs/framework/router";
import { ${n.paramsSchema}, ${n.updateSchema} } from "${typesSpec}";

// The framework runs these before the handler: \`params\` guarantees a valid
// \`:id\`, \`body\` validates the update payload — no manual checks in api.ts.
export const validators: RouteValidator[] = [
  { method: "GET", params: ${n.paramsSchema} },
  { method: "PATCH", params: ${n.paramsSchema}, body: ${n.updateSchema} },
  { method: "DELETE", params: ${n.paramsSchema} },
];
`;
}
