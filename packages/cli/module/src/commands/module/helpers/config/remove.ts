import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { findModuleEntrySpan } from "./span";

export function deregisterModuleFromConfig(
  path: string,
  name: string,
): boolean {
  if (!existsSync(path)) return false;
  const content = readFileSync(path, "utf-8");
  const span = findModuleEntrySpan(content, name);
  if (!span) return false;
  const lineStart = content.lastIndexOf("\n", span.keyStart);
  const cutStart = lineStart === -1 ? 0 : lineStart;
  let cutEnd = span.entryEnd;
  if (content[cutEnd] === ",") cutEnd++;
  writeFileSync(path, content.slice(0, cutStart) + content.slice(cutEnd));
  return true;
}
