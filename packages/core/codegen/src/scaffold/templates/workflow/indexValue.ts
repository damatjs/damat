import type { CrudNames } from "../../naming";

export function workflowsIndex(n: CrudNames): string {
  return `export { create${n.pascal}Workflow } from "./create${n.pascal}";
export { update${n.pascal}Workflow } from "./update${n.pascal}";
export { delete${n.pascal}Workflow } from "./delete${n.pascal}";
export { find${n.pascal}Workflow } from "./find${n.pascal}";
export { findMany${n.pascal}Workflow } from "./findMany${n.pascal}";
`;
}
