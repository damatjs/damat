[Damat Guide](../GUIDE.md) › Building HTTP APIs

# 8. Building HTTP APIs

Routing is **file-based**: every `route.ts` under `src/api/routes/` becomes a URL
path, and the HTTP method exports (`GET`, `POST`, `PUT`, `DELETE`, …) become
handlers. Dynamic segments use `[param]` folders. Handlers receive the Hono
context.

```ts
// src/api/routes/posts/route.ts  ->  /posts
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
// src/api/routes/users/[userId]/route.ts  ->  /users/:userId
import { defineRoute } from "@damatjs/framework/router";

export const GET = defineRoute<{ userId: string }>(async (c, params) => {
  return c.json({ success: true, data: { id: params.userId } });
});
```

Combine routes with module services via `getModule` and add cross-cutting
middleware in `src/api/middleware/`. Routing, the scanner, and middleware are
documented in
[`@damatjs/framework` → router internals](../../packages/framework/docs/router.md).

---

Prev: [← Modules & services](./07-modules-and-services.md) · [Guide home](../GUIDE.md) · Next: [Workflows →](./09-workflows.md)
