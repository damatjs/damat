import { describe, it, expect, spyOn } from "bun:test";

import {
  AppError,
  ValidationError,
  RateLimitError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  initFramework,
} from "../index";

describe("AppError", () => {
  it("applies default statusCode, code and name", () => {
    const err = new AppError("boom");

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe("boom");
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(err.name).toBe("AppError");
    expect(err.details).toBeUndefined();
  });

  it("accepts custom statusCode, code and details", () => {
    const details = { field: "email" };
    const err = new AppError("nope", 418, "TEAPOT", details);

    expect(err.statusCode).toBe(418);
    expect(err.code).toBe("TEAPOT");
    expect(err.details).toBe(details);
  });

  it("is throwable and catchable as an Error", () => {
    expect(() => {
      throw new AppError("thrown");
    }).toThrow("thrown");

    try {
      throw new AppError("caught", 503, "UNAVAILABLE");
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(503);
    }
  });

  it("exposes a stack trace", () => {
    const err = new AppError("with stack");
    expect(typeof err.stack).toBe("string");
    expect(err.stack).toContain("with stack");
  });
});

describe("ValidationError", () => {
  it("uses 400 / VALIDATION_ERROR and carries details", () => {
    const details = [{ path: "name", message: "required" }];
    const err = new ValidationError("invalid input", details);

    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.name).toBe("ValidationError");
    expect(err.message).toBe("invalid input");
    expect(err.details).toBe(details);
  });

  it("works without details", () => {
    const err = new ValidationError("invalid");
    expect(err.details).toBeUndefined();
  });
});

describe("RateLimitError", () => {
  it("uses 429 / RATE_LIMITED and carries retryAfter details", () => {
    const err = new RateLimitError("slow down", { retryAfter: 30 });

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe("RATE_LIMITED");
    expect(err.name).toBe("RateLimitError");
    expect(err.details).toEqual({ retryAfter: 30 });
  });
});

describe("NotFoundError", () => {
  it("defaults its message and uses 404 / NOT_FOUND", () => {
    const err = new NotFoundError();

    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe("Not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.name).toBe("NotFoundError");
  });

  it("accepts a custom message", () => {
    const err = new NotFoundError("user not found");
    expect(err.message).toBe("user not found");
    expect(err.statusCode).toBe(404);
  });
});

describe("AuthenticationError", () => {
  it("defaults its message and uses 401 / UNAUTHORIZED", () => {
    const err = new AuthenticationError();

    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe("Authentication required");
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.name).toBe("AuthenticationError");
  });

  it("accepts a custom message", () => {
    expect(new AuthenticationError("token expired").message).toBe("token expired");
  });
});

describe("AuthorizationError", () => {
  it("defaults its message and uses 403 / FORBIDDEN", () => {
    const err = new AuthorizationError();

    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe("Access denied");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.name).toBe("AuthorizationError");
  });

  it("accepts a custom message", () => {
    expect(new AuthorizationError("not your resource").message).toBe(
      "not your resource",
    );
  });
});

describe("error hierarchy", () => {
  it("every domain error is an AppError and an Error", () => {
    const errors = [
      new ValidationError("a"),
      new RateLimitError("b"),
      new NotFoundError(),
      new AuthenticationError(),
      new AuthorizationError(),
    ];

    for (const err of errors) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
    }
  });

  it("subclasses are distinguishable from one another", () => {
    expect(new ValidationError("a")).not.toBeInstanceOf(NotFoundError);
    expect(new NotFoundError()).not.toBeInstanceOf(ValidationError);
  });
});

describe("initFramework", () => {
  it("returns true and logs an initialization message", () => {
    const log = spyOn(console, "log").mockImplementation(() => {});
    try {
      expect(initFramework()).toBe(true);
      expect(log).toHaveBeenCalledWith("Framework initialized");
    } finally {
      log.mockRestore();
    }
  });
});
