# @damatjs/codegen Unreleased

> Codegen now generates a per-table **params** Zod schema and wires the route
> scaffold into the framework's validation middleware — so a generated `[id]`
> route validates `:id` (and the update body / list query) declaratively instead
> of hand-checking them in the handler.

## What changed

The generated single-resource (`[id]`) route used to validate only the PATCH
body, leaving the handler to guard the path param itself (`if (!id) return 400`)
and the collection handler to re-parse the query. The schema needed to validate
path params — a params object keyed by `id` — didn't exist.

Two changes close that gap:

1. **Type generation** emits a new `<Pascal>ParamsSchema` per table:

   ```ts
   export const ItemsParamsSchema = z.object({
     id: z.string().uuid(),   // value coerced from the PK column's type
   }).strict();
   export type ItemsParams = z.infer<typeof ItemsParamsSchema>;
   ```

   It is keyed by `id` (the `[id]` route folder maps to the `:id` segment) and
   shares the PK→Zod mapping with `generateIdZodSchema`, so the id value never
   diverges between the two.

2. **The route scaffold** declares `params` validators and reads validated data
   with the framework's `getValidated`, dropping the manual checks:

   ```ts
   // [id]/validator.ts — generated
   export const validators: RouteValidator[] = [
     { method: "GET", params: ItemsParamsSchema },
     { method: "PATCH", params: ItemsParamsSchema, body: updateItemsSchema },
     { method: "DELETE", params: ItemsParamsSchema },
   ];

   // [id]/api.ts — generated
   export const GET: RouteHandler = async (c) => {
     const { id } = getValidated<ItemsParams>(c, "params"); // already validated
     // ...
   };
   ```

   The collection route does the same for the create body and list query
   (`getValidated(c, "body")` / `getValidated(c, "query")`).

## Added

- `generateParamsZodSchema(table)` — the `[id]` route's params schema
  (`utils/zodSchemas.ts`); included by `generateZodFile` and `generateZodTypes`.
- `paramsType` / `paramsSchema` on `CrudNames` (`scaffold/naming`).

## Changed / improved

- `generateIdZodSchema` and `generateParamsZodSchema` now share one internal
  PK→Zod mapper.
- Route scaffold templates (`route/collection/api`, `route/id/api`,
  `route/id/validator`) use validation middleware + `getValidated` instead of
  in-handler parsing and `if (!id)` guards; the `api` templates now receive the
  `typesSpec` so they can import the generated param/body/query types.

## Breaking

- None. The new schema and validators are additive; existing generated files are
  still `writeOnce`-guarded (re-running codegen never overwrites your edits). To
  adopt the new style in an **already-scaffolded** route, delete that route's
  `api.ts` / `[id]/api.ts` / `[id]/validator.ts` and re-run codegen.

## Action required

- None — drop-in. Re-run `damat codegen` / `damat module codegen` to regenerate
  `types/` (which gains `<Pascal>ParamsSchema`). New routes scaffold with the
  validation-driven shape automatically. Requires `@damatjs/framework` with
  `getValidated` (see its release note).

## References

- Current behavior: [generators internals](../../packages/core/codegen/docs/generators.md)
  (`generateParamsZodSchema`) and the [HTTP APIs guide](../../docs/guide/08-http-apis.md)
  (Validating requests).
- Source: `packages/core/codegen/src/utils/zodSchemas.ts`,
  `packages/core/codegen/src/scaffold/templates/route/`,
  `packages/core/codegen/src/scaffold/naming/deriveNames.ts`.
