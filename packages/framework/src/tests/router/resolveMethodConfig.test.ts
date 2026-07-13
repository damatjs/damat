import { describe, it, expect } from "bun:test";
import { resolveMethodConfig } from "../../router/resolveMethodConfig";
import type { HttpMethod, RouteModuleConfig } from "../../router/types";
import type { HttpRateLimitConfig, HttpAuthConfig } from "../../config";

const rl = (requests: number, window = "1m"): HttpRateLimitConfig => ({
  requests,
  window,
});

describe("resolveMethodConfig", () => {
  describe("rate limit precedence", () => {
    it("returns empty config when nothing is configured", () => {
      const result = resolveMethodConfig(
        "GET",
        undefined,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual({});
    });

    it("uses the global rate limit as a fallback and records it", () => {
      const global = rl(100, "1h");
      const result = resolveMethodConfig(
        "GET",
        undefined,
        undefined,
        global,
        undefined,
      );
      expect(result.rateLimit).toEqual({ requests: 100, window: "1h" });
      expect(result.globalRateLimit).toBe(global);
    });

    it("prefers the route-level rate limit over the global one", () => {
      const route: RouteModuleConfig = { method: "GET", rateLimit: rl(10) };
      const result = resolveMethodConfig(
        "GET",
        route,
        undefined,
        rl(100),
        undefined,
      );
      expect(result.rateLimit).toEqual(rl(10));
      // route-level wins, so the global is not attached
      expect(result.globalRateLimit).toBeUndefined();
    });

    it("prefers the method-level rate limit over route and global", () => {
      const route: RouteModuleConfig = { method: "POST", rateLimit: rl(10) };
      const methods: RouteModuleConfig[] = [
        { method: "POST", rateLimit: rl(5) },
      ];
      const result = resolveMethodConfig(
        "POST",
        route,
        methods,
        rl(100),
        undefined,
      );
      expect(result.rateLimit).toEqual(rl(5));
    });

    it("explicitly disables the rate limit when method config sets it to false", () => {
      const route: RouteModuleConfig = { method: "POST", rateLimit: rl(10) };
      const methods: RouteModuleConfig[] = [
        { method: "DELETE", rateLimit: false },
      ];
      const result = resolveMethodConfig(
        "DELETE",
        route,
        methods,
        rl(100),
        undefined,
      );
      expect(result.rateLimit).toBeUndefined();
      expect(result.globalRateLimit).toBeUndefined();
    });

    it("falls back to route/global for methods without a matching method config", () => {
      const methods: RouteModuleConfig[] = [
        { method: "POST", rateLimit: rl(5) },
      ];
      const result = resolveMethodConfig(
        "GET",
        undefined,
        methods,
        rl(100),
        undefined,
      );
      expect(result.rateLimit).toEqual({ requests: 100, window: "1m" });
    });
  });

  describe("auth precedence", () => {
    const auth = (type: HttpAuthConfig["type"]): HttpAuthConfig => ({ type });

    it("uses the global auth type as a fallback", () => {
      const result = resolveMethodConfig(
        "GET",
        undefined,
        undefined,
        undefined,
        auth("session"),
      );
      expect(result.auth).toEqual({ type: "session" });
    });

    it("prefers route-level auth over global", () => {
      const route: RouteModuleConfig = { method: "POST", auth: auth("apiKey") };
      const result = resolveMethodConfig(
        "GET",
        route,
        undefined,
        undefined,
        auth("session"),
      );
      expect(result.auth).toEqual(auth("apiKey"));
    });

    it("prefers method-level auth over route and global", () => {
      const route: RouteModuleConfig = { method: "POST", auth: auth("apiKey") };
      const methods: RouteModuleConfig[] = [
        { method: "PUT", auth: auth("flexible") },
      ];
      const result = resolveMethodConfig(
        "PUT",
        route,
        methods,
        undefined,
        auth("session"),
      );
      expect(result.auth).toEqual(auth("flexible"));
    });

    it("explicitly disables auth when method config sets it to false", () => {
      const route: RouteModuleConfig = { method: "POST", auth: auth("apiKey") };
      const methods: RouteModuleConfig[] = [{ method: "GET", auth: false }];
      const result = resolveMethodConfig(
        "GET",
        route,
        methods,
        undefined,
        auth("session"),
      );
      expect(result.auth).toBeUndefined();
    });
  });

  it("resolves rate limit and auth independently in one call", () => {
    const methods: RouteModuleConfig[] = [
      { method: "POST", rateLimit: rl(5), auth: { type: "apiKey" } },
    ];
    const result = resolveMethodConfig(
      "POST" as HttpMethod,
      undefined,
      methods,
      rl(100),
      { type: "session" },
    );
    expect(result.rateLimit).toEqual(rl(5));
    expect(result.auth).toEqual({ type: "apiKey" });
  });
});
