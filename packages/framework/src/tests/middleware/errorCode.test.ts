import { describe, it, expect } from "bun:test";
import { getErrorCodeFromStatus } from "../../middleware/error/code";

describe("getErrorCodeFromStatus", () => {
  it("maps known 4xx statuses to their codes", () => {
    expect(getErrorCodeFromStatus(400)).toBe("BAD_REQUEST");
    expect(getErrorCodeFromStatus(401)).toBe("UNAUTHORIZED");
    expect(getErrorCodeFromStatus(403)).toBe("FORBIDDEN");
    expect(getErrorCodeFromStatus(404)).toBe("NOT_FOUND");
    expect(getErrorCodeFromStatus(405)).toBe("METHOD_NOT_ALLOWED");
    expect(getErrorCodeFromStatus(408)).toBe("REQUEST_TIMEOUT");
    expect(getErrorCodeFromStatus(409)).toBe("CONFLICT");
    expect(getErrorCodeFromStatus(413)).toBe("PAYLOAD_TOO_LARGE");
    expect(getErrorCodeFromStatus(422)).toBe("UNPROCESSABLE_ENTITY");
    expect(getErrorCodeFromStatus(429)).toBe("RATE_LIMITED");
  });

  it("maps known 5xx statuses to their codes", () => {
    expect(getErrorCodeFromStatus(500)).toBe("INTERNAL_ERROR");
    expect(getErrorCodeFromStatus(502)).toBe("BAD_GATEWAY");
    expect(getErrorCodeFromStatus(503)).toBe("SERVICE_UNAVAILABLE");
    expect(getErrorCodeFromStatus(504)).toBe("GATEWAY_TIMEOUT");
  });

  it("returns UNKNOWN_ERROR for unmapped statuses", () => {
    expect(getErrorCodeFromStatus(200)).toBe("UNKNOWN_ERROR");
    expect(getErrorCodeFromStatus(418)).toBe("UNKNOWN_ERROR");
    expect(getErrorCodeFromStatus(0)).toBe("UNKNOWN_ERROR");
    expect(getErrorCodeFromStatus(599)).toBe("UNKNOWN_ERROR");
  });
});
