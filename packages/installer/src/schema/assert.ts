export type UnknownRecord = Record<string, unknown>;

export function assertRecord(input: unknown, name: string): UnknownRecord {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError(`${name} must be an object`);
  }
  return input as UnknownRecord;
}

export function requiredString(record: UnknownRecord, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${key} must be a non-empty string`);
  }
  return value;
}

export function optionalString(
  record: UnknownRecord,
  key: string,
): string | undefined {
  return record[key] === undefined ? undefined : requiredString(record, key);
}

export function rejectUnknownKeys(
  record: UnknownRecord,
  allowed: readonly string[],
): void {
  const unknown = Object.keys(record).find((key) => !allowed.includes(key));
  if (unknown) throw new TypeError(`unknown field: ${unknown}`);
}
