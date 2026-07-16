import type {
  AcceptedCapability,
  ProvidedCapability,
} from "../types/manifest";
import { assertRecord, rejectUnknownKeys, requiredString } from "./assert";
import { assertSafeRelativePath } from "./path";

const CAPABILITY = /^[a-z][a-z0-9-]*$/;

function assertCapability(name: string): void {
  if (!CAPABILITY.test(name))
    throw new TypeError(`capability ${name} must be kebab-case`);
}

function safeDestination(value: string, name: string): string {
  assertSafeRelativePath(value, name);
  const variables = value.match(/\{[^}]+\}/g) ?? [];
  if (variables.some((variable) => variable !== "{id}"))
    throw new TypeError(`${name} only supports the {id} template`);
  return value;
}

export function parseProvides(value: unknown): Record<string, ProvidedCapability> {
  const capabilities = assertRecord(value, "provides");
  return Object.fromEntries(
    Object.entries(capabilities).map(([name, input]) => {
      assertCapability(name);
      const record = assertRecord(input, `provides.${name}`);
      rejectUnknownKeys(record, ["from", "fallbackTo"]);
      const from = assertSafeRelativePath(requiredString(record, "from"), "from");
      const fallback = record.fallbackTo;
      return [name, {
        from,
        ...(fallback !== undefined && {
          fallbackTo: safeDestination(requiredString(record, "fallbackTo"), "fallbackTo"),
        }),
      }];
    }),
  );
}

export function parseAccepts(value: unknown): Record<string, AcceptedCapability> {
  const capabilities = assertRecord(value, "accepts");
  return Object.fromEntries(
    Object.entries(capabilities).map(([name, input]) => {
      assertCapability(name);
      const record = assertRecord(input, `accepts.${name}`);
      rejectUnknownKeys(record, ["to"]);
      return [name, { to: safeDestination(requiredString(record, "to"), "to") }];
    }),
  );
}
