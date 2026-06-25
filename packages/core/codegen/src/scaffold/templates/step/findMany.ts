import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE } from '../constant';

export function stepFindMany(n: CrudNames, typesSpec: string): string {
  return `${SCAFFOLD_NOTE}
import { createStep, StepResponse } from "@damatjs/workflow-engine";
import { getModule } from "@damatjs/framework";
import type { ${n.rowType}, ${n.queryType} } from "${typesSpec}";

export const findMany${n.pascal}Step = createStep<${n.queryType}, ${n.rowType}[]>(
  "${n.moduleId}.${n.prop}.findMany",
  async (query, _ctx) => {
    const service = getModule("${n.moduleId}");
    if (!service) throw new Error("${n.moduleId} module not loaded");
    const { limit, offset, orderBy, orderDir, ...where } = query;
    const rows = await service.${n.prop}.findMany({
      where,
      ...(limit !== undefined ? { take: limit } : {}),
      ...(offset !== undefined ? { skip: offset } : {}),
      ...(orderBy
        ? { orderBy: [{ column: orderBy, direction: orderDir === "desc" ? "DESC" : "ASC" }] }
        : {}),
    });
    return new StepResponse(rows);
  },
  undefined,
  { description: "List ${n.prop}", idempotent: true },
);
`;
}
