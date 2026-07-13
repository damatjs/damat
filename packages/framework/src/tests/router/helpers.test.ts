import { describe, it, expect } from "bun:test";
import { defineRoute, getValidated } from "../../router/helpers";
import { Hono } from "@damatjs/deps/hono";
import { VALIDATED_CONTEXT_KEY } from "../../router/types";

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

    const handler = defineRoute<{ userId: string; postId: string }>(
      (c, params) => {
        return c.json({ userId: params.userId, postId: params.postId });
      },
    );

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

describe("getValidated", () => {
  it("returns the validated value stored under the requested target", async () => {
    const app = new Hono();
    app.get("/x", (c) => {
      c.set(VALIDATED_CONTEXT_KEY, { query: { q: "hi" } } as never);
      return c.json({ q: getValidated<{ q: string }>(c, "query") });
    });

    const res = await app.request("/x");
    expect((await res.json()).q).toEqual({ q: "hi" });
  });

  it("returns undefined when no validated data was stored", async () => {
    const app = new Hono();
    app.get("/x", (c) => {
      const value = getValidated(c, "body");
      return c.json({ missing: value === undefined });
    });

    const res = await app.request("/x");
    expect((await res.json()).missing).toBe(true);
  });

  it("returns undefined for a target that was not validated", async () => {
    const app = new Hono();
    app.get("/x", (c) => {
      c.set(VALIDATED_CONTEXT_KEY, { query: { q: "hi" } } as never);
      const value = getValidated(c, "params");
      return c.json({ missing: value === undefined });
    });

    const res = await app.request("/x");
    expect((await res.json()).missing).toBe(true);
  });
});
