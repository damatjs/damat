import { assertProviderRoleMatch } from "@damatjs/provider";
import type { ApiKeyPrincipal, AuthPrincipal, AuthProvider } from "./types";

const operations = [
  "authenticate",
  "getPrincipal",
  "issueApiKey",
  "getApiKey",
  "listApiKeys",
  "verifyApiKey",
  "revokeApiKey",
] as const;

export function assertAuthProvider(
  value: unknown,
): asserts value is AuthProvider {
  if (!value || typeof value !== "object")
    throw new Error("Auth provider module service must be an object");
  assertProviderRoleMatch("auth", value);
  for (const operation of operations)
    if (typeof (value as AuthProvider)[operation] !== "function")
      throw new Error(
        `Auth provider module service must implement ${operation}`,
      );
  const rotate = (value as AuthProvider).rotateApiKey;
  if (rotate !== undefined && typeof rotate !== "function")
    throw new Error("Auth provider rotateApiKey must be a function");
}

export function isAuthPrincipal(value: unknown): value is AuthPrincipal {
  if (!value || typeof value !== "object") return false;
  const principal = value as Partial<AuthPrincipal>;
  return (
    typeof principal.id === "string" &&
    principal.id.trim().length > 0 &&
    optionalString(principal.email) &&
    optionalString(principal.orgId) &&
    (principal.claims === undefined || isRecord(principal.claims))
  );
}

export function isApiKeyPrincipal(value: unknown): value is ApiKeyPrincipal {
  if (!isAuthPrincipal(value)) return false;
  const principal = value as Partial<ApiKeyPrincipal>;
  return (
    typeof principal.keyId === "string" &&
    principal.keyId.trim().length > 0 &&
    Array.isArray(principal.scopes) &&
    principal.scopes.every((scope) => typeof scope === "string")
  );
}

function optionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
