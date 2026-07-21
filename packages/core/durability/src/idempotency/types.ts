import type { QueryResultRow } from "@damatjs/deps/pg";
import type { DurabilityExecutor } from "../client/types";

export type JsonPrimitive = boolean | null | number | string;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface IdempotencyOptions {
  scope: string;
  key: string;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  executor?: DurabilityExecutor;
}

export interface IdempotencyResult<T extends JsonValue> {
  value: T;
  replayed: boolean;
}

export type IdempotencyClaim<T extends JsonValue = JsonValue> =
  { acquired: true } | { acquired: false; value: T };

export type IdempotencyRow = QueryResultRow & {
  status: "running" | "completed";
  result: JsonValue;
  expired: boolean;
};
