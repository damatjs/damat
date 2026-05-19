import type { ColumnSchema } from '@damatjs/orm-type';

export function columnNameSet(columns: ColumnSchema[]): Set<string> {
  return new Set(columns.map((c) => c.name));
}

export function assertKnownColumns(
  obj: Record<string, unknown>,
  known: Set<string>,
  context: string,
): void {
  for (const key of Object.keys(obj)) {
    if (!known.has(key)) {
      throw new Error(
        `[query:${context}] Unknown column "${key}". ` +
        `Known columns: ${[...known].join(", ")}`,
      );
    }
  }
}

export function assertKnownColumnList(
  names: string[],
  known: Set<string>,
  context: string,
): void {
  for (const name of names) {
    if (!known.has(name)) {
      throw new Error(
        `[query:${context}] Unknown column "${name}". ` +
        `Known columns: ${[...known].join(", ")}`,
      );
    }
  }
}
