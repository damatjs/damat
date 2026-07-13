import { describe, it, expect } from "bun:test";
import { Hono } from "@damatjs/deps/hono";
import { z } from "@damatjs/deps/zod";
import { ValidationError } from "@damatjs/types";
import {
  validate,
  createValidatorMiddleware,
} from "../../middleware/validator";

describe("validate", () => {
  it("returns parsed data for valid input", () => {
    const schema = z.object({ name: z.string() });
    expect(validate(schema, { name: "abel" })).toEqual({ name: "abel" });
  });

  it("wraps a ZodError into a ValidationError", () => {
    const schema = z.object({ age: z.number() });
    let thrown: unknown;
    try {
      validate(schema, { age: "nope" });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(ValidationError);
    expect((thrown as ValidationError).message).toBe("Validation failed");
  });

  it("re-throws non-Zod errors untouched", () => {
    const boom = new Error("not a zod error");
    const schema = {
      parse: () => {
        throw boom;
      },
    };
    expect(() => validate(schema, {})).toThrow(boom);
  });
});

describe("createValidatorMiddleware", () => {
  type ErrBody = {
    success: boolean;
    error: {
      code: string;
      message: string;
      details: Array<{ path: string; message: string }>;
    };
  };

  it("passes a valid POST body and reaches the handler", async () => {
    const app = new Hono();
    app.post(
      "/users",
      createValidatorMiddleware({
        body: z.object({ name: z.string() }),
      } as never),
      (c) => c.json({ ok: true }),
    );

    const res = await app.request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "abel" }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("returns a 400 VALIDATION_ERROR for an invalid POST body", async () => {
    const app = new Hono();
    app.post(
      "/users",
      createValidatorMiddleware({
        body: z.object({ name: z.string() }),
      } as never),
      (c) => c.json({ ok: true }),
    );

    const res = await app.request("/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: 123 }),
    });
    const body = (await res.json()) as ErrBody;
    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0]!.path).toBe("name");
  });

  it("returns a 400 when a required body is missing entirely on POST", async () => {
    const app = new Hono();
    app.post(
      "/users",
      createValidatorMiddleware({
        body: z.object({ name: z.string() }),
      } as never),
      (c) => c.json({ ok: true }),
    );

    // No body sent -> c.req.json() throws -> data.body is undefined.
    const res = await app.request("/users", { method: "POST" });
    const body = (await res.json()) as ErrBody;
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0]!.message).toBe("Body is required");
  });

  it("validates query params on GET requests", async () => {
    const app = new Hono();
    app.get(
      "/search",
      createValidatorMiddleware({
        query: z.object({ q: z.string() }),
      } as never),
      (c) => c.json({ ok: true }),
    );

    const ok = await app.request("/search?q=hello");
    expect(ok.status).toBe(200);
  });

  it("validates a JSON body via the 'json' target and exposes the parsed value to the handler", async () => {
    const app = new Hono();
    app.post(
      "/items",
      createValidatorMiddleware({ json: z.object({ a: z.string() }) } as never),
      // The handler reads the validated value the same way Hono validators expose it.
      (c) => c.json({ value: c.req.valid("json" as never) }),
    );

    const res = await app.request("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: "hello" }),
    });
    expect(res.status).toBe(200);
    // The validated body is passed through to the handler.
    expect((await res.json()).value).toEqual({ a: "hello" });
  });

  it("returns a 400 VALIDATION_ERROR for an invalid JSON body via the 'json' target", async () => {
    const app = new Hono();
    app.post(
      "/items",
      createValidatorMiddleware({ json: z.object({ a: z.string() }) } as never),
      (c) => c.json({ ok: true }),
    );

    const res = await app.request("/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ a: 123 }),
    });
    const body = (await res.json()) as ErrBody;
    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0]!.path).toBe("a");
  });

  it("returns a 400 when a required json body is missing entirely", async () => {
    const app = new Hono();
    app.post(
      "/items",
      createValidatorMiddleware({ json: z.object({ a: z.string() }) } as never),
      (c) => c.json({ ok: true }),
    );

    // No body sent -> c.req.json() throws -> data.json is undefined.
    const res = await app.request("/items", { method: "POST" });
    const body = (await res.json()) as ErrBody;
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0]!.message).toBe("Json is required");
  });

  it("validates and exposes route params via the 'params' target", async () => {
    const app = new Hono();
    app.get(
      "/users/:id",
      createValidatorMiddleware({
        params: z.object({ id: z.string() }),
      } as never),
      (c) => c.json({ ok: true }),
    );

    const res = await app.request("/users/42");
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("returns a 400 VALIDATION_ERROR when params fail validation", async () => {
    const app = new Hono();
    app.get(
      "/users/:id",
      createValidatorMiddleware({
        params: z.object({ id: z.coerce.number() }),
      } as never),
      (c) => c.json({ ok: true }),
    );

    const res = await app.request("/users/not-a-number");
    const body = (await res.json()) as ErrBody;
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details[0]!.path).toBe("id");
  });

  // The "<target> is required" guards only fire when the parsed request data
  // for a target is falsy. Hono always returns an object for query()/param(),
  // so to exercise those defensive branches we drive the middleware directly
  // with a fake context whose getters return undefined (boundary-level fake,
  // no module mocking).
  function fakeContext(method: string, getters: Record<string, unknown>) {
    const captured: { status?: number; payload?: unknown } = {};
    return {
      captured,
      c: {
        req: {
          method,
          query: () => getters.query,
          param: () => getters.params,
          json: async () => getters.json,
          addValidatedData: () => {},
        },
        set: () => {},
        json: (payload: unknown, status?: number) => {
          captured.payload = payload;
          captured.status = status;
          return payload;
        },
      },
    };
  }

  it("throws 'Query is required' when the parsed query is missing", async () => {
    const mw = createValidatorMiddleware({
      query: z.object({ q: z.string() }),
    } as never);
    const { c, captured } = fakeContext("GET", {
      query: undefined,
      params: {},
    });
    await mw(c as never, (async () => {}) as never);
    expect(captured.status).toBe(400);
    const payload = captured.payload as ErrBody;
    expect(payload.error.details[0]!.message).toBe("Query is required");
  });

  it("re-throws a non-Zod error raised while parsing a target", async () => {
    const boom = new Error("schema exploded");
    const mw = createValidatorMiddleware({
      body: {
        parse: () => {
          throw boom;
        },
      },
    } as never);
    const { c } = fakeContext("POST", {
      query: {},
      params: {},
      json: { a: 1 },
    });
    await expect(mw(c as never, (async () => {}) as never)).rejects.toThrow(
      boom,
    );
  });

  it("throws 'Params is required' when the parsed params are missing", async () => {
    const mw = createValidatorMiddleware({
      params: z.object({ id: z.string() }),
    } as never);
    const { c, captured } = fakeContext("GET", {
      query: {},
      params: undefined,
    });
    await mw(c as never, (async () => {}) as never);
    expect(captured.status).toBe(400);
    const payload = captured.payload as ErrBody;
    expect(payload.error.details[0]!.message).toBe("Params is required");
  });
});
