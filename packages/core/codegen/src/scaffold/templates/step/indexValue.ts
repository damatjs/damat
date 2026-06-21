import type { CrudNames } from "../../naming";

export function stepsIndex(n: CrudNames): string {
  return `export { create${n.pascal}Step } from "./create${n.pascal}";
export { update${n.pascal}Step, type Update${n.pascal}Input } from "./update${n.pascal}";
export { delete${n.pascal}Step } from "./delete${n.pascal}";
export { find${n.pascal}Step } from "./find${n.pascal}";
export { findMany${n.pascal}Step } from "./findMany${n.pascal}";
`;
}
