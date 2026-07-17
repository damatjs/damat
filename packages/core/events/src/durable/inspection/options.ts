import {
  getDurabilityClient,
  validateCursorSigningKey,
} from "@damatjs/durability";
import type { DurableEventInspectionOptions } from "./client-types";

export type ResolvedEventInspectionOptions = Required<
  Pick<
    DurableEventInspectionOptions,
    "visibility" | "redaction" | "staleAfterMs"
  >
> &
  Omit<
    DurableEventInspectionOptions,
    "visibility" | "redaction" | "staleAfterMs"
  > & {
    client: NonNullable<DurableEventInspectionOptions["client"]>;
  };

export function resolveEventInspectionOptions(
  options: DurableEventInspectionOptions,
): ResolvedEventInspectionOptions {
  if (!options || options.cursorSigningKey === undefined) {
    throw new Error("cursorSigningKey is required");
  }
  validateCursorSigningKey(options.cursorSigningKey);
  const staleAfterMs = options.staleAfterMs ?? 30_000;
  if (!Number.isSafeInteger(staleAfterMs) || staleAfterMs < 1) {
    throw new Error("staleAfterMs must be a positive safe integer");
  }
  return {
    ...options,
    visibility: options.visibility ?? "metadata",
    redaction: options.redaction ?? {},
    staleAfterMs,
    client: options.client ?? getDurabilityClient(),
  };
}
