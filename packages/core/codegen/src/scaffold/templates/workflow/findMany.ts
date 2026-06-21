import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE } from '../constant';


export function workflowFindMany(n: CrudNames, typesSpec: string, stepsSpec: string): string {
  return `${SCAFFOLD_NOTE}
import { createWorkflow } from "@damatjs/workflow-engine";
import { findMany${n.pascal}Step } from "${stepsSpec}/findMany${n.pascal}";
import type { ${n.rowType}, ${n.queryType} } from "${typesSpec}";

export const findMany${n.pascal}Workflow = createWorkflow<${n.queryType}, ${n.rowType}[]>(
  "${n.moduleId}.${n.prop}.findMany",
  (input, ctx) => findMany${n.pascal}Step(input, ctx),
);

export { findMany${n.pascal}Workflow as default };
`;
}
