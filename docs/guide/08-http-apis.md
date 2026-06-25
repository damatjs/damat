[Damat Guide](../GUIDE.md) › Building HTTP APIs

# 8. Building HTTP APIs

Routing is **file-based**: every `route.ts` under `src/api/routes/` becomes a URL
path, and the HTTP method exports (`GET`, `POST`, `PUT`, `DELETE`, …) become
handlers. Dynamic segments use `[param]` folders. Handlers receive the Hono
context.

File routes mount under a base path — **`/api` by default** — so
`src/api/routes/posts/route.ts` serves `GET /api/posts`. Change the base with
`projectConfig.http.api.entryRouter`.

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

For typed params, use `defineRoute<Params>`:

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
framework runs the matching validator before the handler: invalid requests are
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

`codegen` scaffolds exactly this shape for every table — the `*ParamsSchema` /
`new*Schema` / `update*Schema` / `*QuerySchema` it generates into `@<module>/types`
are wired into the route's `validators`, and the handlers read them with
`getValidated`. `route.ts` re-exports the handlers, `validators`, and `middleware`
so the framework can mount them.

Combine routes with module services via `getModule` and add cross-cutting
middleware in `src/api/middleware/`. Routing, the scanner, and middleware are
documented in
[`@damatjs/framework` → router internals](../../packages/framework/docs/router.md).

---

Prev: [← Modules & services](./07-modules-and-services.md) · [Guide home](../GUIDE.md) · Next: [Workflows →](./09-workflows.md)
