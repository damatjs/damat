import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE } from "../constant";

export function stepFind(n: CrudNames, typesSpec: string): string {
  return `${SCAFFOLD_NOTE}
import { createStep, StepResponse } from "@damatjs/workflow-engine";
import { getModule } from "@damatjs/framework";
import type { ${n.rowType}, ${n.idType} } from "${typesSpec}";

export const find${n.pascal}Step = createStep<${n.idType}, ${n.rowType} | null>(
  "${n.moduleId}.${n.prop}.find",
  async (id, _ctx) => {
    const service = getModule("${n.moduleId}");
    if (!service) throw new Error("${n.moduleId} module not loaded");
    const row = (await service.${n.prop}.find({ where: { ${n.pk}: id } })) as ${n.rowType} | null;
    return new StepResponse(row);
  },
  undefined,
  { description: "Find ${n.prop} by ${n.pk}", idempotent: true },
);
`;
}
