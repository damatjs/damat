import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE } from "../constant";

export function stepCreate(n: CrudNames, typesSpec: string): string {
  return `${SCAFFOLD_NOTE}
import { createStep, StepResponse } from "@damatjs/workflow-engine";
import { getModule } from "@damatjs/framework";
import type { ${n.newType}, ${n.rowType} } from "${typesSpec}";

export const create${n.pascal}Step = createStep<${n.newType}, ${n.rowType}, ${n.rowType}>(
  "${n.moduleId}.${n.prop}.create",
  async (input, _ctx) => {
    const service = getModule("${n.moduleId}");
    if (!service) throw new Error("${n.moduleId} module not loaded");
    const created = (await service.${n.prop}.create({ data: input })) as ${n.rowType};
    return new StepResponse(created, created);
  },
  async (created, _ctx) => {
    const service = getModule("${n.moduleId}");
    if (!service) return;
    await service.${n.prop}.delete({ where: { ${n.pk}: created.${n.pk} } });
  },
  { description: "Create ${n.prop}" },
);
`;
}
