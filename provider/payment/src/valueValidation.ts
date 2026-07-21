export function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

export function optionalDate(value: unknown): boolean {
  return value === undefined || value instanceof Date;
}

export function optionalInteger(value: unknown): boolean {
  return (
    value === undefined || (Number.isSafeInteger(value) && Number(value) >= 0)
  );
}

export function optionalRecord(value: unknown): boolean {
  return (
    value === undefined ||
    (Boolean(value) && typeof value === "object" && !Array.isArray(value))
  );
}
