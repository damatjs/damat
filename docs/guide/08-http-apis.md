[Damat Guide](../GUIDE.md) › Building HTTP APIs

# 8. Building HTTP APIs

The HTTP layer is **file-based** and convention-driven: you drop `route.ts` files
into a folder tree, export a handler per method, and the framework scans them into
a [Hono](https://hono.dev) router at boot. This chapter walks the four things you
actually write — the file layout, the handlers, typed params, and request
validation — then how routes reach your module services.

## File-based routing

Every `route.ts` under `src/api/routes/` becomes a URL path. The folder tree _is_
the route table:

| File                                      | URL                        |
| ----------------------------------------- | -------------------------- |
| `src/api/routes/posts/route.ts`           | `/api/posts`               |
| `src/api/routes/users/[userId]/route.ts`  | `/api/users/:userId`       |
| `src/api/routes/files/[...path]/route.ts` | `/api/files/*` (catch-all) |

Two conventions govern the mapping:

- **Base path.** File routes mount under a base — **`/api` by default** — so
  `posts/route.ts` serves `GET /api/posts`. Change it with
  `projectConfig.http.api.entryRouter`.
- **Dynamic segments.** A `[param]` folder becomes a `:param` route parameter;
  `[...rest]` becomes a Hono catch-all (`*`).

## Route handlers

A `route.ts` exports one handler per HTTP method it serves — `GET`, `POST`,
`PUT`, `PATCH`, `DELETE`. Each is a `RouteHandler` receiving the Hono context; the
framework only mounts the methods you actually export.

```ts
// src/api/routes/posts/route.ts  ->  /api/posts
import { RouteHandler } from "@damatjs/framework/router";

export const GET: RouteHandler = async (c) => {
  return c.json({ success: true, data: { posts: [] } });
};

export const POST: RouteHandler = async (c) => {
  const body = await c.req.json();
  return c.json({ success: true, data: body }, 201);
};
```

`RouteHandler` is `(c) => Promise<Response> | Response`. Anything a route file
doesn't export simply isn't wired — there's no boilerplate to opt out of a method.

## Typed route params

For a route with dynamic segments, `defineRoute<Params>` types the second argument
so `params` is checked at compile time — no reaching into `c.req.param()` by hand:

```ts
// src/api/routes/users/[userId]/route.ts  ->  /api/users/:userId
import { defineRoute } from "@damatjs/framework/router";

export const GET = defineRoute<{ userId: string }>(async (c, params) => {
  return c.json({ success: true, data: { id: params.userId } });
});
```

## Validating requests

A `route.ts` can export a `validators` array — one `RouteValidator` per method
declaring Zod schemas for the request's `body`, `query`, and/or `params`. The
framework runs the matching validator **before** the handler: invalid requests are
rejected with a `400 VALIDATION_ERROR` envelope, and the parsed + coerced data is
handed to the handler via `getValidated`. Handlers never re-parse the body, check
for a missing `:id`, or coerce query strings by hand.

```ts
// src/api/routes/posts/[id]/validator.ts
import type { RouteValidator } from "@damatjs/framework/router";
import { PostsParamsSchema, updatePostsSchema } from "@blog/types";

export const validators: RouteValidator[] = [
  { method: "GET", params: PostsParamsSchema },
  { method: "PATCH", params: PostsParamsSchema, body: updatePostsSchema },
  { method: "DELETE", params: PostsParamsSchema },
];
```

```ts
// src/api/routes/posts/[id]/api.ts
import { getValidated, type RouteHandler } from "@damatjs/framework/router";
import type { PostsParams, UpdatePosts } from "@blog/types";

export const PATCH: RouteHandler = async (c) => {
  const { id } = getValidated<PostsParams>(c, "params"); // already validated
  const data = getValidated<UpdatePosts>(c, "body");
  // ...call the workflow with id + data...
};
```

### The three-file convention

The framework only mounts what `route.ts` exports, so the conventional split keeps
each file small and re-exports the pieces from `route.ts`:

```ts
// src/api/routes/posts/[id]/route.ts — what the framework mounts
export { GET, PATCH, DELETE } from "./api";
export { validators } from "./validator";
// export { middleware } from "./middleware";   // optional, per-route
```

For a simple endpoint you can keep the handlers and `validators` directly in
`route.ts` — the `api.ts` + `validator.ts` split is just the convention codegen
uses. `codegen` scaffolds exactly this shape for every table: the `*ParamsSchema` /
`new*Schema` / `update*Schema` / `*QuerySchema` it generates into `@<module>/types`
are wired into the route's `validators`, and the handlers read them with
`getValidated`.

## Reaching services and middleware

Inside a handler, fetch a module's service with `getModule(id)` and call its
generated CRUD accessors or explicit integrations (see
[Modules & services](./07-modules-and-services.md)).
Cross-cutting middleware lives in `src/api/middleware/`; per-route `middleware`,
`config`, and `configs` (rate-limit / auth per method) attach from the route file
itself.

The scanner, middleware pipeline, and per-route config are documented in
[`@damatjs/framework` → router internals](../../packages/framework/docs/router.md).

---

Prev: [← Querying & CRUD](./07b-crud-reference.md) · [Guide home](../GUIDE.md) · Next: [Workflows →](./09-workflows.md)
