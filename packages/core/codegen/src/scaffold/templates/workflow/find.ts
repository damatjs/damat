import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE, WORKFLOW_OVERRIDE_HINT } from "../constant";

export function workflowFind(
  n: CrudNames,
  typesSpec: string,
  stepsSpec: string,
): string {
  return `${SCAFFOLD_NOTE}
import { createWorkflow } from "@damatjs/workflow-engine";
import { find${n.pascal}Step } from "${stepsSpec}";
import type { ${n.rowType}, ${n.idType} } from "${typesSpec}";

export const find${n.pascal}Workflow = createWorkflow<${n.idType}, ${n.rowType} | null>(
  "${n.moduleId}.${n.prop}.find",
${WORKFLOW_OVERRIDE_HINT}
  (input, ctx) => find${n.pascal}Step(input, ctx),
);

export { find${n.pascal}Workflow as default };
`;
}
