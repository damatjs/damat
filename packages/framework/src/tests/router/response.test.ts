import { describe, it, expect } from "bun:test";
import { response } from "../../router/response";
import type { Context } from "@damatjs/deps/hono";

const createMockContext = (): Context => {
  return {
    json: (data: unknown, status?: number) =>
      new Response(JSON.stringify(data), {
        status: status || 200,
        headers: { "Content-Type": "application/json" },
      }),
    body: (_data: unknown, status?: number) =>
      new Response(null, { status: status || 200 }),
    get: (_key: string) => "test-request-id",
  } as unknown as Context;
};

describe("response helpers", () => {
  describe("json", () => {
    it("returns formatted JSON response with default status 200", async () => {
      const c = createMockContext();
      const res = response.json(c, { name: "test" });
      const data = (await res.json()) as {
        success: boolean;
        data: { name: string };
        meta: { requestId: string; timestamp: string };
      };

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({ name: "test" });
      expect(data.meta.requestId).toBe("test-request-id");
      expect(data.meta.timestamp).toBeDefined();
    });

    it("accepts custom status code", async () => {
      const c = createMockContext();
      const res = response.json(c, { id: 1 }, 201);
      expect(res.status).toBe(201);
    });
  });

  describe("created", () => {
    it("returns 201 status response", async () => {
      const c = createMockContext();
      const res = response.created(c, { id: 1 });
      const data = (await res.json()) as {
        success: boolean;
        data: { id: number };
      };

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({ id: 1 });
    });
  });

  describe("noContent", () => {
    it("returns 204 status with empty body", async () => {
      const c = createMockContext();
      const res = response.noContent(c);
      expect(res.status).toBe(204);
    });
  });

  describe("error", () => {
    it("returns formatted error response with default status 400", async () => {
      const c = createMockContext();
      const res = response.error(c, "Not found", "NOT_FOUND");
      const data = (await res.json()) as {
        success: boolean;
        error: { code: string; message: string };
        meta: { requestId: string };
      };

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("NOT_FOUND");
      expect(data.error.message).toBe("Not found");
      expect(data.meta.requestId).toBe("test-request-id");
    });

    it("accepts custom status code", async () => {
      const c = createMockContext();
      const res = response.error(c, "Unauthorized", "UNAUTHORIZED", 401);
      expect(res.status).toBe(401);
    });

    it("returns 500 for server errors", async () => {
      const c = createMockContext();
      const res = response.error(c, "Internal error", "INTERNAL_ERROR", 500);
      const data = (await res.json()) as { error: { code: string } };

      expect(res.status).toBe(500);
      expect(data.error.code).toBe("INTERNAL_ERROR");
    });
  });
});
