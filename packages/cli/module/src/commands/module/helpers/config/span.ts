export interface EntrySpan {
  keyStart: number;
  bodyStart: number;
  bodyEnd: number;
  entryEnd: number;
}

export function findModuleEntrySpan(
  content: string,
  name: string,
): EntrySpan | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(
    `(^|[\\s{,])(["']?)${escaped}\\2\\s*:\\s*\\{`,
    "m",
  ).exec(content);
  if (!match || match.index === undefined) return null;
  const keyStart = match.index + (match[1]?.length ?? 0);
  const bodyStart = match.index + match[0].length;
  let depth = 1;
  for (let index = bodyStart; index < content.length; index++) {
    if (content[index] === "{") depth++;
    else if (content[index] === "}" && --depth === 0) {
      return { keyStart, bodyStart, bodyEnd: index, entryEnd: index + 1 };
    }
  }
  return null;
}
