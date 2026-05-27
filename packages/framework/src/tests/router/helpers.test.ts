import { describe, it, expect } from "bun:test";
import { defineRoute } from "../../router/helpers";
import { Hono } from "@damatjs/deps/hono";

describe("defineRoute", () => {
  it("wraps handler and extracts params", async () => {
    const app = new Hono();

    const handler = defineRoute<{ id: string }>((c, params) => {
      return c.json({ id: params.id });
    });

    app.get("/users/:id", handler);

    const res = await app.request("/users/123");
    const data = (await res.json()) as { id: string };

    expect(data.id).toBe("123");
  });

  it("handles multiple params", async () => {
    const app = new Hono();

    const handler = defineRoute<{ userId: string; postId: string }>((c, params) => {
      return c.json({ userId: params.userId, postId: params.postId });
    });

    app.get("/users/:userId/posts/:postId", handler);

    const res = await app.request("/users/1/posts/42");
    const data = (await res.json()) as { userId: string; postId: string };

    expect(data.userId).toBe("1");
    expect(data.postId).toBe("42");
  });

  it("supports async handlers", async () => {
    const app = new Hono();

    const handler = defineRoute(async (c, _params) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return c.json({ async: true });
    });

    app.get("/async", handler);

    const res = await app.request("/async");
    const data = (await res.json()) as { async: boolean };

    expect(data.async).toBe(true);
  });

  it("handles routes without params", async () => {
    const app = new Hono();

    const handler = defineRoute((c, params) => {
      return c.json({ empty: Object.keys(params).length });
    });

    app.get("/static", handler);

    const res = await app.request("/static");
    const data = (await res.json()) as { empty: number };

    expect(data.empty).toBe(0);
  });
});
