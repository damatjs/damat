import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE } from '../constant';


export function stepDelete(n: CrudNames, typesSpec: string): string {
  return `${SCAFFOLD_NOTE}
import { createStep } from "@damatjs/workflow-engine";
import { getModule } from "@damatjs/framework";
import type { ${n.rowType}, ${n.idType} } from "${typesSpec}";

export const delete${n.pascal}Step = createStep<${n.idType}, ${n.rowType} | null>(
  "${n.moduleId}.${n.prop}.delete",
  async (id, _ctx) => {
    const service = getModule("${n.moduleId}");
    if (!service) throw new Error("${n.moduleId} module not loaded");
    const existing = await service.${n.prop}.find({ where: { ${n.pk}: id } });
    await service.${n.prop}.delete({ where: { ${n.pk}: id } });
    return existing;
  },
  // Reverse: recreate the deleted row if a later step fails. Spread into a
  // fresh object so it satisfies the CRUD \`data\` contract (Record<string,
  // unknown>) — \`service\` stays fully typed, no cast needed.
  async (_id, deleted, _ctx) => {
    if (!deleted) return;
    const service = getModule("${n.moduleId}");
    if (!service) return;
    await service.${n.prop}.create({ data: { ...deleted } });
  },
  { description: "Delete ${n.prop}" },
);
`;
}