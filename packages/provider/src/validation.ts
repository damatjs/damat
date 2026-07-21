import type { ProviderBinding } from "./types";

export function assertProviderRole(role: string): void {
  if (!role.trim() || role !== role.trim())
    throw new Error("Provider role must be non-empty and trimmed");
}

export function assertProviderBinding(
  role: string,
  value: unknown,
): asserts value is ProviderBinding {
  assertProviderRole(role);
  if (!value || typeof value !== "object")
    throw new Error(`Provider "${role}" binding must be an object`);
  const moduleId = (value as Partial<ProviderBinding>).module;
  if (typeof moduleId !== "string" || !moduleId.trim())
    throw new Error(`Provider "${role}" must reference a module`);
}

export function assertProviderRoleMatch(role: string, service: unknown): void {
  if (!service || typeof service !== "object") return;
  const marked = (service as { providerRole?: unknown }).providerRole;
  if (marked !== undefined && marked !== role)
    throw new Error(
      `Provider "${role}" references a service marked for "${String(marked)}"`,
    );
}
