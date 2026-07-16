import { posix } from "node:path";
import { assertSafeRelativePath } from "../schema/path";

export function expandDestination(template: string, id: string): string {
  assertSafeRelativePath(template, "capability destination");
  const variables = template.match(/\{[^}]+\}/g) ?? [];
  if (variables.some((variable) => variable !== "{id}"))
    throw new TypeError("capability destination only supports {id}");
  return assertSafeRelativePath(
    posix.normalize(template.replaceAll("{id}", id)),
    "capability destination",
  );
}
