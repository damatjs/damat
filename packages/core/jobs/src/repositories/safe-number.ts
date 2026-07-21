export type PostgresInteger = number | string;

export function mapSafeInteger(value: PostgresInteger, label: string): number {
  if (typeof value === "string" && !/^-?\d+$/.test(value)) {
    throw new RangeError(`${label} must be a safe integer`);
  }
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(number)) {
    throw new RangeError(`${label} must be a safe integer`);
  }
  return number;
}
