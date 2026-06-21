import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE } from '../constant';

export function stepUpdate(n: CrudNames, typesSpec: string): string {
  return `${SCAFFOLD_NOTE}
import { createStep } from "@damatjs/workflow-engine";
import { getModule } from "@damatjs/framework";
import type { ${n.updateType}, ${n.rowType}, ${n.idType} } from "${typesSpec}";

export interface Update${n.pascal}Input {
  ${n.pk}: ${n.idType};
  data: ${n.updateType};
}

export const update${n.pascal}Step = createStep<Update${n.pascal}Input, ${n.rowType}>(
  "${n.moduleId}.${n.prop}.update",
  async (input, _ctx) => {
    const service = getModule("${n.moduleId}");
    if (!service) throw new Error("${n.moduleId} module not loaded");
    const rows = await service.${n.prop}.update({
      where: { ${n.pk}: input.${n.pk} },
      data: input.data,
    });
    const row = rows[0];
    if (!row) throw new Error("${n.prop} not found");
    return row;
  },
  // Fallback: re-apply the prior state if a later step fails. Generated stub —
  // capture the prior row in the forward step and restore it here if your
  // workflow needs update to be reversible.
  async (_input, _updated, _ctx) => {},
  { description: "Update ${n.prop}" },
);
`;
}
