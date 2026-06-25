import type { Context } from "@damatjs/deps/hono";
import type { RouteHandler, ValidationTarget, ValidatedData } from "./types";
import { VALIDATED_CONTEXT_KEY } from "./types";

export function defineRoute<
  P extends Record<string, string> = Record<string, string>,
>(
  handler: (c: Context, params: P) => Promise<Response> | Response,
): RouteHandler {
  return async (c: Context) => {
    const params = c.req.param() as P;
    return handler(c, params);
  };
}

/**
 * Read the request data the validator middleware already parsed and coerced for
 * this route — the `body` / `query` / `params` / `json` exactly as the matching
 * zod schema produced it (numbers, dates, etc. coerced from their raw string
 * form).
 *
 * The framework runs a route's `validators` (rejecting invalid requests with a
 * 400) before the handler, so inside the handler the returned value is already
 * validated — no need to re-parse or re-check it. Only targets the route
 * actually declares a validator for are populated; everything else is
 * `undefined`.
 *
 * ```ts
 * export const PATCH: RouteHandler = async (c) => {
 *   const { id } = getValidated<ItemParams>(c, "params");
 *   const data = getValidated<UpdateItem>(c, "body");
 *   // ...
 * };
 * ```
 */
export function getValidated<T = unknown>(
  c: Context,
  target: ValidationTarget,
): T {
  const store = c.get(VALIDATED_CONTEXT_KEY) as ValidatedData | undefined;
  return store?.[target] as T;
}
