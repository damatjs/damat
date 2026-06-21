import type { CrudNames } from "../../../naming";
import { SCAFFOLD_NOTE } from '../../constant';

export function routeIdValidator(n: CrudNames, typesSpec: string): string {
  return `${SCAFFOLD_NOTE}
import type { RouteValidator } from "@damatjs/framework/router";
import { ${n.updateSchema} } from "${typesSpec}";

export const validators: RouteValidator[] = [
  { method: "PATCH", body: ${n.updateSchema} },
];
`;
}

