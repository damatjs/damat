/**
 * RegistryClient test suite — all assertions run against a stub Bun.serve
 * server; no real network traffic is made.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { RegistryClient } from "../src/index.js";
import type { Server } from "bun";

// ---------------------------------------------------------------------------
// Canned stub data
// ---------------------------------------------------------------------------

const STUB_PACKAGES = [
  { name: "@damatjs/user", kind: "module", origin: "damatjs", description: "User management" },
  { name: "logging", kind: "plain", origin: "community", description: null },
];

const STUB_PKG_INFO = {
  name: "@damatjs/user",
  kind: "module",
  origin: "damatjs",
  owner: "damatjs-bot",
  description: "User management",
  versions: ["0.1.0", "0.2.0"],
  latest: "0.2.0",
  verification: { publisherId: "damatjs-bot" },
  verdict: { status: "pass", score: 98, reasons: [] },
  capabilities: { workflows: ["createUser"] },
};

const STUB_TARBALL = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]); // fake gzip magic bytes

const STUB_VERDICT = {
  status: "pass",
  score: 98,
  reasons: ["no-malicious-code"],
  summary: "All checks passed",
  checkedAt: "2026-07-09T00:00:00.000Z",
};

// PUT recorder — captures last publish request for assertions
let lastPublishAuth: string | null = null;
let lastPublishUrl: string | null = null;

// ---------------------------------------------------------------------------
// Stub server
// ---------------------------------------------------------------------------

let server: Server;
let baseUrl: string;

beforeAll(() => {
  server = Bun.serve({
    port: 0, // OS assigns a free port
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;

      // GET /api/registry/packages
      if (req.method === "GET" && path === "/api/registry/packages") {
        const kind = url.searchParams.get("kind");
        const pkgs = kind ? STUB_PACKAGES.filter((p) => p.kind === kind) : STUB_PACKAGES;
        return Response.json({ packages: pkgs });
      }

      // GET /api/registry/packages/:name (exact name, no version segment)
      // Path: /api/registry/packages/<encoded-name>
      const pkgInfoMatch = path.match(/^\/api\/registry\/packages\/([^/]+)$/);
      if (req.method === "GET" && pkgInfoMatch) {
        const name = decodeURIComponent(pkgInfoMatch[1]!);
        if (name === STUB_PKG_INFO.name) return Response.json(STUB_PKG_INFO);
        return Response.json({ error: "not found" }, { status: 404 });
      }

      // GET /api/registry/packages/:name/:version/source
      const sourceMatch = path.match(/^\/api\/registry\/packages\/([^/]+)\/([^/]+)\/source$/);
      if (req.method === "GET" && sourceMatch) {
        return new Response(STUB_TARBALL, {
          headers: { "content-type": "application/octet-stream" },
        });
      }

      // GET /api/registry/packages/:name/:version/verdict
      const verdictMatch = path.match(/^\/api\/registry\/packages\/([^/]+)\/([^/]+)\/verdict$/);
      if (req.method === "GET" && verdictMatch) {
        const name = decodeURIComponent(verdictMatch[1]!);
        if (name === "unknown-pkg") return Response.json({ status: "unscanned" });
        return Response.json(STUB_VERDICT);
      }

      // PUT /api/npm/:name
      const npmPublishMatch = path.match(/^\/api\/npm\/([^/]+)$/);
      if (req.method === "PUT" && npmPublishMatch) {
        lastPublishAuth = req.headers.get("authorization");
        lastPublishUrl = path;
        return Response.json({ success: true, package: { name: "@damatjs/user", version: "0.3.0" } }, { status: 201 });
      }

      return Response.json({ error: "not found" }, { status: 404 });
    },
  });

  baseUrl = `http://localhost:${server.port}/api`;
});

afterAll(() => {
  server.stop(true);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RegistryClient.listPackages", () => {
  test("returns all packages when no filter is applied", async () => {
    const client = new RegistryClient({ baseUrl });
    const pkgs = await client.listPackages();
    expect(pkgs).toHaveLength(2);
    expect(pkgs.map((p) => p.name).sort()).toEqual(["@damatjs/user", "logging"]);
  });

  test("filters by kind=module", async () => {
    const client = new RegistryClient({ baseUrl });
    const pkgs = await client.listPackages({ kind: "module" });
    expect(pkgs).toHaveLength(1);
    expect(pkgs[0]!.name).toBe("@damatjs/user");
    expect(pkgs[0]!.kind).toBe("module");
  });

  test("filters by kind=plain", async () => {
    const client = new RegistryClient({ baseUrl });
    const pkgs = await client.listPackages({ kind: "plain" });
    expect(pkgs).toHaveLength(1);
    expect(pkgs[0]!.name).toBe("logging");
  });
});

describe("RegistryClient.packageInfo", () => {
  test("returns kind, owner, verification and verdict for a known package", async () => {
    const client = new RegistryClient({ baseUrl });
    const info = await client.packageInfo("@damatjs/user");
    expect(info.name).toBe("@damatjs/user");
    expect(info.kind).toBe("module");
    expect(info.owner).toBe("damatjs-bot");
    expect(info.verification).toEqual({ publisherId: "damatjs-bot" });
    expect(info.verdict).not.toBeNull();
    expect(info.verdict?.status).toBe("pass");
    expect(info.capabilities).toBeDefined();
  });

  test("throws on unknown package (404)", async () => {
    const client = new RegistryClient({ baseUrl });
    await expect(client.packageInfo("no-such-pkg")).rejects.toThrow("404");
  });
});

describe("RegistryClient.packageSource", () => {
  test("returns raw bytes for a package version", async () => {
    const client = new RegistryClient({ baseUrl });
    const bytes = await client.packageSource("@damatjs/user", "0.2.0");
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
    // First two bytes are gzip magic
    expect(bytes[0]).toBe(0x1f);
    expect(bytes[1]).toBe(0x8b);
  });
});

describe("RegistryClient.verdict", () => {
  test("returns verdict payload for a scanned package", async () => {
    const client = new RegistryClient({ baseUrl });
    const v = await client.verdict("@damatjs/user", "0.2.0");
    expect(v.status).toBe("pass");
    expect(v.score).toBe(98);
    expect(Array.isArray(v.reasons)).toBe(true);
    expect(v.summary).toBe("All checks passed");
    expect(v.checkedAt).toBeTruthy();
  });

  test("returns { status: 'unscanned' } for an unknown package", async () => {
    const client = new RegistryClient({ baseUrl });
    const v = await client.verdict("unknown-pkg", "1.0.0");
    expect(v.status).toBe("unscanned");
  });
});

describe("RegistryClient.publish", () => {
  test("sends PUT to /api/npm/:name with Authorization: Bearer token", async () => {
    lastPublishAuth = null;
    lastPublishUrl = null;
    const client = new RegistryClient({ baseUrl, token: "secret-tok" });
    const result = await client.publish({
      name: "@damatjs/user",
      body: { _id: "@damatjs/user", versions: {}, _attachments: {} },
    });
    expect(result.success).toBe(true);
    expect(result.package?.name).toBe("@damatjs/user");
    expect(result.package?.version).toBe("0.3.0");
    expect(lastPublishAuth).toBe("Bearer secret-tok");
    expect(lastPublishUrl).toBe("/api/npm/%40damatjs%2Fuser");
  });

  test("omits Authorization header when no token is set", async () => {
    lastPublishAuth = null;
    const client = new RegistryClient({ baseUrl }); // no token
    await client.publish({
      name: "@damatjs/user",
      body: {},
    });
    expect(lastPublishAuth).toBeNull();
  });
});
