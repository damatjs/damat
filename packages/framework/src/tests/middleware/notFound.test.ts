import { describe, it, expect } from "bun:test";
import { notFoundHandler } from "../../middleware/notFound";
import type { Context } from "@damatjs/deps/hono";

const createMockContext = (requestId?: string): Context => {
  return {
    get: (key: string) => (key === "requestId" ? requestId : undefined),
    json: (data: unknown, status?: number) =>
      new Response(JSON.stringify(data), {
        status: status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
  } as unknown as Context;
};

type NotFoundBody = {
  success: boolean;
  error: { code: string; message: string };
  meta: { requestId: string; timestamp: string };
};

describe("notFoundHandler", () => {
  it("returns a 404 with a NOT_FOUND error envelope", async () => {
    const res = notFoundHandler(createMockContext("req-7"));
    const body = (await res.json()) as NotFoundBody;

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toBe("The requested endpoint does not exist");
    expect(body.meta.requestId).toBe("req-7");
    expect(body.meta.timestamp).toBeDefined();
  });

  it("falls back to 'unknown' requestId when missing", async () => {
    const res = notFoundHandler(createMockContext(undefined));
    const body = (await res.json()) as NotFoundBody;
    expect(body.meta.requestId).toBe("unknown");
  });

  it("emits a valid ISO timestamp", async () => {
    const res = notFoundHandler(createMockContext("req-8"));
    const body = (await res.json()) as NotFoundBody;
    const parsed = new Date(body.meta.timestamp);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});
