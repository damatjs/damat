import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE, WORKFLOW_OVERRIDE_HINT } from "../constant";

export function workflowUpdate(
  n: CrudNames,
  typesSpec: string,
  stepsSpec: string,
): string {
  return `${SCAFFOLD_NOTE}
import { createWorkflow } from "@damatjs/workflow-engine";
import { update${n.pascal}Step, type Update${n.pascal}Input } from "${stepsSpec}";
import type { ${n.rowType} } from "${typesSpec}";

export const update${n.pascal}Workflow = createWorkflow<Update${n.pascal}Input, ${n.rowType}>(
  "${n.moduleId}.${n.prop}.update",
${WORKFLOW_OVERRIDE_HINT}
  (input, ctx) => update${n.pascal}Step(input, ctx),
);

export { update${n.pascal}Workflow as default };
`;
}
