import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanDirectory } from "../../../router/scanner/scanDirectory";

let root: string;

function makeRoute(...segments: string[]) {
  const dir = join(root, ...segments);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "route.ts"), "export const GET = () => {};");
}

beforeEach(() => {
  // Each test gets an isolated temp directory tree, so the suite is
  // deterministic and never touches the real filesystem under src/.
  root = mkdtempSync(join(tmpdir(), "damat-scan-"));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("scanDirectory", () => {
  it("returns an empty array for a non-existent directory", () => {
    const routes = scanDirectory(join(root, "does-not-exist"));
    expect(routes).toEqual([]);
  });

  it("returns an empty array for a directory with no route files", () => {
    mkdirSync(join(root, "empty"), { recursive: true });
    writeFileSync(join(root, "empty", "notes.txt"), "hello");
    const routes = scanDirectory(root);
    expect(routes).toEqual([]);
  });

  it("maps a root-level route.ts to '/'", () => {
    writeFileSync(join(root, "route.ts"), "export const GET = () => {};");
    const routes = scanDirectory(root);
    expect(routes).toHaveLength(1);
    expect(routes[0]!.urlPath).toBe("/");
    expect(routes[0]!.filePath).toBe(join(root, "route.ts"));
  });

  it("recursively discovers nested routes and prefixes url paths with '/'", () => {
    makeRoute("users");
    makeRoute("posts");
    const routes = scanDirectory(root);
    const paths = routes.map((r) => r.urlPath).sort();
    expect(paths).toEqual(["/posts", "/users"]);
  });

  it("converts dynamic [param] folders to :param segments", () => {
    makeRoute("users", "[userId]");
    const routes = scanDirectory(root);
    expect(routes).toHaveLength(1);
    expect(routes[0]!.urlPath).toBe("/users/:userId");
  });

  it("converts catch-all [...rest] folders to wildcard segments", () => {
    makeRoute("api", "[...rest]");
    const routes = scanDirectory(root);
    expect(routes).toHaveLength(1);
    expect(routes[0]!.urlPath).toBe("/api/*");
  });

  it("recognizes route.js files in addition to route.ts", () => {
    const dir = join(root, "legacy");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "route.js"), "module.exports = {};");
    const routes = scanDirectory(root);
    expect(routes).toHaveLength(1);
    expect(routes[0]!.urlPath).toBe("/legacy");
  });

  it("ignores non-route files inside route folders", () => {
    const dir = join(root, "users");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "route.ts"), "export const GET = () => {};");
    writeFileSync(join(dir, "helper.ts"), "export const x = 1;");
    const routes = scanDirectory(root);
    expect(routes).toHaveLength(1);
    expect(routes[0]!.urlPath).toBe("/users");
  });

  it("discovers deeply nested mixed static and dynamic routes", () => {
    makeRoute("api", "v1", "users", "[userId]", "posts", "[postId]");
    const routes = scanDirectory(root);
    expect(routes).toHaveLength(1);
    expect(routes[0]!.urlPath).toBe("/api/v1/users/:userId/posts/:postId");
  });
});
