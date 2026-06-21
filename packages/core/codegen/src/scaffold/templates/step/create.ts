import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE } from '../constant';


export function stepCreate(n: CrudNames, typesSpec: string): string {
  return `${SCAFFOLD_NOTE}
import { createStep } from "@damatjs/workflow-engine";
import { getModule } from "@damatjs/framework";
import type { ${n.newType}, ${n.rowType} } from "${typesSpec}";

export const create${n.pascal}Step = createStep<${n.newType}, ${n.rowType}>(
  "${n.moduleId}.${n.prop}.create",
  async (input, _ctx) => {
    const service = getModule("${n.moduleId}");
    if (!service) throw new Error("${n.moduleId} module not loaded");
    return service.${n.prop}.create({ data: input });
  },
  // Reverse: undo the create if a later step in the workflow fails.
  async (_input, created, _ctx) => {
    const service = getModule("${n.moduleId}");
    if (!service) return;
    await service.${n.prop}.delete({ where: { ${n.pk}: created.${n.pk} } });
  },
  { description: "Create ${n.prop}" },
);
`;
}