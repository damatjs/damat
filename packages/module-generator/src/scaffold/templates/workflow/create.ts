import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE, WORKFLOW_OVERRIDE_HINT } from "../constant";

export function workflowCreate(
  n: CrudNames,
  typesSpec: string,
  stepsSpec: string,
): string {
  return `${SCAFFOLD_NOTE}
import { createWorkflow } from "@damatjs/workflow-engine";
import { create${n.pascal}Step } from "${stepsSpec}";
import type { ${n.newType}, ${n.rowType} } from "${typesSpec}";

export const create${n.pascal}Workflow = createWorkflow<${n.newType}, ${n.rowType}>(
  "${n.moduleId}.${n.prop}.create",
${WORKFLOW_OVERRIDE_HINT}
  (input, ctx) => create${n.pascal}Step(input, ctx),
);

export { create${n.pascal}Workflow as default };
`;
}
