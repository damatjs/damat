import type { CrudNames } from "../../../naming";
import { SCAFFOLD_NOTE } from "../../constant";

export function routeCollectionValidator(
  n: CrudNames,
  typesSpec: string,
): string {
  return `${SCAFFOLD_NOTE}
import type { RouteValidator } from "@damatjs/framework/router";
import { ${n.newSchema}, ${n.querySchema} } from "${typesSpec}";

export const validators: RouteValidator[] = [
  { method: "POST", body: ${n.newSchema} },
  { method: "GET", query: ${n.querySchema} },
];
`;
}
