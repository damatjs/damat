import type { ApiKeyRecord, IssuedApiKey } from "./types";

export function isApiKeyRecord(value: unknown): value is ApiKeyRecord {
  if (!value || typeof value !== "object") return false;
  const key = value as Partial<ApiKeyRecord>;
  return (
    requiredStrings(key, ["id", "subjectId", "label", "prefix"]) &&
    stringArray(key.scopes) &&
    key.createdAt instanceof Date &&
    optionalDate(key.expiresAt) &&
    optionalDate(key.lastUsedAt) &&
    optionalDate(key.revokedAt) &&
    (key.metadata === undefined || isRecord(key.metadata))
  );
}

export function isIssuedApiKey(value: unknown): value is IssuedApiKey {
  return (
    isApiKeyRecord(value) &&
    typeof (value as IssuedApiKey).secret === "string" &&
    (value as IssuedApiKey).secret.length > 0
  );
}

function stringArray(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function optionalDate(value: unknown): value is Date | undefined {
  return value === undefined || value instanceof Date;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredStrings<T extends object>(
  value: T,
  keys: readonly (keyof T)[],
): boolean {
  return keys.every(
    (key) => typeof value[key] === "string" && String(value[key]).length > 0,
  );
}
