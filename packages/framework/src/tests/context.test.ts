import { describe, it, expect } from "bun:test";
import { Hono } from "@damatjs/deps/hono";
import { getRequestLogger, getTeam, getUser } from "../context";
import type { ILogger } from "@damatjs/logger";

describe("typed context accessors", () => {
  it("returns what middleware set (logger, user, team) with types intact", async () => {
    const fakeLogger = { info: () => {} } as unknown as ILogger;
    const seen: Record<string, unknown> = {};

    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("logger", fakeLogger);
      c.set("user", { id: "u-1", role: "admin" });
      c.set("team", { id: "t-9" });
      await next();
    });
    app.get("/", (c) => {
      seen.logger = getRequestLogger(c);
      seen.user = getUser(c);
      seen.team = getTeam(c);
      // The ContextVariableMap augmentation types these without casts.
      seen.userId = getUser(c)?.id;
      return c.text("ok");
    });

    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(seen.logger).toBe(fakeLogger);
    expect(seen.user).toEqual({ id: "u-1", role: "admin" });
    expect(seen.team).toEqual({ id: "t-9" });
    expect(seen.userId).toBe("u-1");
  });

  it("returns undefined for user/team when no auth middleware ran", async () => {
    const app = new Hono();
    const seen: Record<string, unknown> = {
      user: "sentinel",
      team: "sentinel",
    };
    app.get("/", (c) => {
      seen.user = getUser(c);
      seen.team = getTeam(c);
      return c.text("ok");
    });
    await app.request("/");
    expect(seen.user).toBeUndefined();
    expect(seen.team).toBeUndefined();
  });
});
