import type { z } from "@damatjs/deps/zod";
import type { HttpMethod } from "./http";

export type ZodSchema = z.ZodType<any, any>;

export interface RouteValidator {
  method: HttpMethod;
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  json?: ZodSchema;
}

/** The request parts a {@link RouteValidator} can validate / coerce. */
export type ValidationTarget = "body" | "query" | "params" | "json";

/**
 * Parsed (and coerced) request data the validator middleware stores on the
 * request context after a successful validation — keyed by the target it came
 * from. Read it inside a handler with `getValidated` instead of re-parsing the
 * raw request.
 */
export type ValidatedData = Partial<Record<ValidationTarget, unknown>>;

/**
 * Context-variable key under which the validator middleware stashes the parsed
 * {@link ValidatedData}. Internal wiring — prefer `getValidated` over reading
 * this key directly.
 */
export const VALIDATED_CONTEXT_KEY = "validated";
