import type { CrudNames } from "../../naming";
import { SCAFFOLD_NOTE, WORKFLOW_OVERRIDE_HINT } from "../constant";

export function workflowDelete(
  n: CrudNames,
  typesSpec: string,
  stepsSpec: string,
): string {
  return `${SCAFFOLD_NOTE}
import { createWorkflow } from "@damatjs/workflow-engine";
import { delete${n.pascal}Step } from "${stepsSpec}";
import type { ${n.idType} } from "${typesSpec}";

export const delete${n.pascal}Workflow = createWorkflow<${n.idType}, boolean>(
  "${n.moduleId}.${n.prop}.delete",
${WORKFLOW_OVERRIDE_HINT}
  (input, ctx) => delete${n.pascal}Step(input, ctx),
);

export { delete${n.pascal}Workflow as default };
`;
}
