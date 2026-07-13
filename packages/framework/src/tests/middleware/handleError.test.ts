import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { handleError } from "../../middleware/error/handleError";
import { AppError } from "@damatjs/types";
import { z, ZodError } from "@damatjs/deps/zod";
import { HTTPException, type Context } from "@damatjs/deps/hono";

const createMockLogger = () => ({
  info: mock(() => {}),
  error: mock(() => {}),
  warn: mock(() => {}),
  debug: mock(() => {}),
});

const createMockContext = (
  requestId: string | undefined = "req-1",
): Context => {
  return {
    req: { method: "POST", path: "/widgets" },
    get: (key: string) => (key === "requestId" ? requestId : undefined),
    json: (data: unknown, status?: number) =>
      new Response(JSON.stringify(data), {
        status: status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
  } as unknown as Context;
};

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

beforeEach(() => {
  // Default to a non-dev environment so stack traces are not leaked.
  process.env.NODE_ENV = "production";
});

afterEach(() => {
  process.env.NODE_ENV = ORIGINAL_NODE_ENV;
});

type ErrorBody = {
  success: boolean;
  error: { code: string; message: string; details?: unknown };
  meta: { requestId: string; timestamp: string };
};

describe("handleError", () => {
  it("maps an AppError to its status, code, message and details", async () => {
    const logger = createMockLogger();
    const error = new AppError("Boom", 409, "CONFLICT", { field: "name" });
    const res = handleError(createMockContext(), error, logger as never);
    const body = (await res.json()) as ErrorBody;

    expect(res.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("CONFLICT");
    expect(body.error.message).toBe("Boom");
    expect(body.error.details).toEqual({ field: "name" });
    expect(body.meta.requestId).toBe("req-1");
    expect(logger.error).toHaveBeenCalled();
  });

  it("maps a ZodError to a 400 VALIDATION_ERROR with formatted issues", async () => {
    const logger = createMockLogger();
    let zodError: ZodError;
    try {
      z.object({ name: z.string() }).parse({ name: 123 });
      throw new Error("expected parse to throw");
    } catch (e) {
      zodError = e as ZodError;
    }

    const res = handleError(createMockContext(), zodError, logger as never);
    const body = (await res.json()) as ErrorBody;

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toBe("Request validation failed");
    expect(Array.isArray(body.error.details)).toBe(true);
    expect((body.error.details as Array<{ path: string }>)[0]!.path).toBe(
      "name",
    );
  });

  it("maps an HTTPException to its status and a derived code", async () => {
    const logger = createMockLogger();
    const error = new HTTPException(404, { message: "Missing widget" });
    const res = handleError(createMockContext(), error, logger as never);
    const body = (await res.json()) as ErrorBody;

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("Missing widget");
  });

  it("hides internal error details for generic errors in production", async () => {
    const logger = createMockLogger();
    const res = handleError(
      createMockContext(),
      new Error("db exploded"),
      logger as never,
    );
    const body = (await res.json()) as ErrorBody;

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("An unexpected error occurred");
    expect(body.error.details).toBeUndefined();
  });

  it("exposes the message and stack for generic errors in development", async () => {
    process.env.NODE_ENV = "development";
    const logger = createMockLogger();
    const res = handleError(
      createMockContext(),
      new Error("db exploded"),
      logger as never,
    );
    const body = (await res.json()) as ErrorBody;

    expect(res.status).toBe(500);
    expect(body.error.message).toBe("db exploded");
    expect(body.error.details).toBeDefined();
  });

  it("handles non-Error values with the generic internal error fallback", async () => {
    const logger = createMockLogger();
    const res = handleError(
      createMockContext(),
      "just a string",
      logger as never,
    );
    const body = (await res.json()) as ErrorBody;

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });

  it("captures the content of a thrown non-Error string in the logs", async () => {
    const logger = createMockLogger();
    handleError(createMockContext(), "boom-string", logger as never);

    // The thrown value must not be silently dropped: it should appear in a log
    // call's metadata so the failure remains diagnosable in production.
    const loggedThrown = logger.error.mock.calls.some(
      (call) =>
        (call[2] as { thrown?: string } | undefined)?.thrown === "boom-string",
    );
    expect(loggedThrown).toBe(true);
  });

  it("captures the content of a thrown non-Error object in the logs", async () => {
    const logger = createMockLogger();
    handleError(
      createMockContext(),
      { code: 42, reason: "nope" },
      logger as never,
    );

    const loggedThrown = logger.error.mock.calls.some((call) =>
      ((call[2] as { thrown?: string } | undefined)?.thrown ?? "").includes(
        "42",
      ),
    );
    expect(loggedThrown).toBe(true);
  });

  it("does not throw when a non-Error value with a circular reference is thrown", async () => {
    const logger = createMockLogger();
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;

    // safeStringify must not blow up on circular references.
    const res = handleError(createMockContext(), circular, logger as never);
    const body = (await res.json()) as ErrorBody;
    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(logger.error).toHaveBeenCalled();
  });

  it("surfaces a thrown non-Error value as the message in development", async () => {
    process.env.NODE_ENV = "development";
    const logger = createMockLogger();
    const res = handleError(createMockContext(), "dev-detail", logger as never);
    const body = (await res.json()) as ErrorBody;

    expect(res.status).toBe(500);
    expect(body.error.message).toBe("dev-detail");
  });

  it("falls back to 'unknown' requestId when none is set on the context", async () => {
    const logger = createMockLogger();
    // Build a context whose get() never returns a requestId.
    const ctx = {
      req: { method: "POST", path: "/widgets" },
      get: () => undefined,
      json: (data: unknown, status?: number) =>
        new Response(JSON.stringify(data), {
          status: status ?? 200,
          headers: { "Content-Type": "application/json" },
        }),
    } as unknown as Context;
    const res = handleError(
      ctx,
      new AppError("x", 400, "BAD_REQUEST"),
      logger as never,
    );
    const body = (await res.json()) as ErrorBody;
    expect(body.meta.requestId).toBe("unknown");
  });
});
