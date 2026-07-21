import { assertRecord, requiredString, type UnknownRecord } from "./assert";

export function requiredArray(record: UnknownRecord, key: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new TypeError(`${key} must be an array`);
  return value;
}

export function stringArray(value: unknown, name: string): string[] {
  if (!Array.isArray(value)) throw new TypeError(`${name} must be an array`);
  return value.map((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new TypeError(`${name}[${index}] must be a non-empty string`);
    }
    return item;
  });
}

export function stringRecord(
  value: unknown,
  name: string,
): Record<string, string> {
  const record = assertRecord(value, name);
  return Object.fromEntries(
    Object.keys(record).map((key) => [
      requiredString({ key }, "key"),
      requiredString(record, key),
    ]),
  );
}
