import { describe, it, expect } from "bun:test";
import { sortRoutes } from "../../../router/scanner/sortRoutes";
import type { ScannedRoute } from "../../../router/types";

describe("sortRoutes", () => {
  it("places static routes before dynamic routes", () => {
    const routes: ScannedRoute[] = [
      { urlPath: "/users/:id", filePath: "/routes/users/[userId]/route.ts" },
      { urlPath: "/users", filePath: "/routes/users/route.ts" },
    ];

    const sorted = sortRoutes(routes);

    expect(sorted[0]!.urlPath).toBe("/users");
    expect(sorted[1]!.urlPath).toBe("/users/:id");
  });

  it("places catch-all routes last", () => {
    const routes: ScannedRoute[] = [
      { urlPath: "/api/*", filePath: "/routes/api/[...auth]/route.ts" },
      { urlPath: "/api/users", filePath: "/routes/api/users/route.ts" },
      { urlPath: "/api/:id", filePath: "/routes/api/[userId]/route.ts" },
    ];

    const sorted = sortRoutes(routes);

    expect(sorted[0]!.urlPath).toBe("/api/users");
    expect(sorted[1]!.urlPath).toBe("/api/:id");
    expect(sorted[2]!.urlPath).toBe("/api/*");
  });

  it("sorts by path depth when both are static", () => {
    const routes: ScannedRoute[] = [
      { urlPath: "/api/v1/users", filePath: "/routes/api/v1/users/route.ts" },
      { urlPath: "/api", filePath: "/routes/api/route.ts" },
      { urlPath: "/api/v1", filePath: "/routes/api/v1/route.ts" },
    ];

    const sorted = sortRoutes(routes);

    expect(sorted[0]!.urlPath).toBe("/api");
    expect(sorted[1]!.urlPath).toBe("/api/v1");
    expect(sorted[2]!.urlPath).toBe("/api/v1/users");
  });

  it("sorts alphabetically for same depth static routes", () => {
    const routes: ScannedRoute[] = [
      { urlPath: "/users", filePath: "/routes/users/route.ts" },
      { urlPath: "/posts", filePath: "/routes/posts/route.ts" },
      { urlPath: "/comments", filePath: "/routes/comments/route.ts" },
    ];

    const sorted = sortRoutes(routes);

    expect(sorted[0]!.urlPath).toBe("/comments");
    expect(sorted[1]!.urlPath).toBe("/posts");
    expect(sorted[2]!.urlPath).toBe("/users");
  });

  it("does not mutate original array", () => {
    const routes: ScannedRoute[] = [
      { urlPath: "/users/:id", filePath: "/routes/users/[userId]/route.ts" },
      { urlPath: "/users", filePath: "/routes/users/route.ts" },
    ];

    sortRoutes(routes);

    expect(routes[0]!.urlPath).toBe("/users/:id");
  });

  it("handles empty array", () => {
    const sorted = sortRoutes([]);
    expect(sorted).toEqual([]);
  });

  it("handles complex mixed routes", () => {
    const routes: ScannedRoute[] = [
      { urlPath: "/api/*", filePath: "" },
      { urlPath: "/api/users/:id", filePath: "" },
      { urlPath: "/api/posts", filePath: "" },
      { urlPath: "/api", filePath: "" },
      { urlPath: "/api/users", filePath: "" },
      { urlPath: "/api/:version", filePath: "" },
    ];

    const sorted = sortRoutes(routes);

    expect(sorted[0]!.urlPath).toBe("/api");
    expect(sorted[1]!.urlPath).toBe("/api/posts");
    expect(sorted[2]!.urlPath).toBe("/api/users");
    expect(sorted[3]!.urlPath).toBe("/api/:version");
    expect(sorted[4]!.urlPath).toBe("/api/*");
    expect(sorted[5]!.urlPath).toBe("/api/users/:id");
  });
});
