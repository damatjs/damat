import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { clearRegistryCache, loadRegistryIndex, lookupEntry } from "../registry/load";
import type { RegistryIndex } from "../registry/types";

let tmp: string;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mcp-registry-"));
  clearRegistryCache();
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

const sampleIndex: RegistryIndex = {
  modules: {
    "damatjs/user": { source: "github:damatjs/user", description: "users" },
    billing: { source: "github:acme/billing" },
  },
};

describe("loadRegistryIndex — filesystem", () => {
  test("reads a registry.json file path directly", async () => {
    const file = join(tmp, "registry.json");
    writeFileSync(file, JSON.stringify(sampleIndex));
    const index = await loadRegistryIndex(file);
    expect(Object.keys(index.modules)).toEqual(["damatjs/user", "billing"]);
  });

  test("resolves a directory to its registry.json", async () => {
    writeFileSync(join(tmp, "registry.json"), JSON.stringify(sampleIndex));
    const index = await loadRegistryIndex(tmp);
    expect(index.modules.billing.source).toBe("github:acme/billing");
  });

  test("throws when the index file does not exist", async () => {
    const missing = join(tmp, "nope.json");
    await expect(loadRegistryIndex(missing)).rejects.toThrow(
      /Registry index not found/,
    );
  });

  test("throws when the index directory has no registry.json", async () => {
    await expect(loadRegistryIndex(tmp)).rejects.toThrow(
      /Registry index not found/,
    );
  });

  test("throws on malformed JSON", async () => {
    const file = join(tmp, "registry.json");
    writeFileSync(file, "{ not json");
    await expect(loadRegistryIndex(file)).rejects.toThrow();
  });

  test("throws when JSON lacks a modules object", async () => {
    const file = join(tmp, "registry.json");
    writeFileSync(file, JSON.stringify({ notModules: 1 }));
    await expect(loadRegistryIndex(file)).rejects.toThrow(/"modules" object/);
  });

  test("throws when top-level JSON is null", async () => {
    const file = join(tmp, "registry.json");
    writeFileSync(file, "null");
    await expect(loadRegistryIndex(file)).rejects.toThrow(/"modules" object/);
  });
});

describe("loadRegistryIndex — URL", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test("fetches and parses an http(s) index", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(sampleIndex), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as typeof fetch;
    const index = await loadRegistryIndex("https://example.com/registry.json");
    expect(Object.keys(index.modules)).toContain("damatjs/user");
  });

  test("404 explains the registry was not found and points at the env var", async () => {
    globalThis.fetch = (async () =>
      new Response("nope", { status: 404 })) as typeof fetch;
    await expect(
      loadRegistryIndex("https://example.com/registry.json"),
    ).rejects.toThrow(/not found \(404\).*DAMAT_MODULE_REGISTRY/);
  });

  test("5xx is reported as a registry server error", async () => {
    globalThis.fetch = (async () =>
      new Response("boom", { status: 503 })) as typeof fetch;
    await expect(
      loadRegistryIndex("https://example.com/registry.json"),
    ).rejects.toThrow(/server error \(503\)/);
  });

  test("other non-ok statuses keep the generic fetch-failed message", async () => {
    globalThis.fetch = (async () =>
      new Response("go away", { status: 403 })) as typeof fetch;
    await expect(
      loadRegistryIndex("https://example.com/registry.json"),
    ).rejects.toThrow(/fetch failed \(403\)/);
  });

  test("a network failure is reported as could-not-reach", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;
    await expect(
      loadRegistryIndex("https://example.com/registry.json"),
    ).rejects.toThrow(/Could not reach registry.*ECONNREFUSED/);
  });

  test("an aborted fetch is reported as a timeout", async () => {
    globalThis.fetch = (async () => {
      const err = new Error("aborted");
      err.name = "TimeoutError";
      throw err;
    }) as typeof fetch;
    await expect(
      loadRegistryIndex("https://example.com/registry.json"),
    ).rejects.toThrow(/timed out after 10s/);
  });

  test("a non-JSON body is reported as invalid JSON", async () => {
    globalThis.fetch = (async () =>
      new Response("<html>oops</html>", { status: 200 })) as typeof fetch;
    await expect(
      loadRegistryIndex("https://example.com/registry.json"),
    ).rejects.toThrow(/did not return valid JSON/);
  });

  test("caches a fetched index and re-fetches after clearRegistryCache", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response(JSON.stringify(sampleIndex), { status: 200 });
    }) as typeof fetch;

    await loadRegistryIndex("https://example.com/registry.json");
    await loadRegistryIndex("https://example.com/registry.json");
    expect(calls).toBe(1); // second call served from cache

    clearRegistryCache();
    await loadRegistryIndex("https://example.com/registry.json");
    expect(calls).toBe(2);
  });

  test("drops malformed entries but keeps valid ones", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          modules: {
            good: { source: "github:acme/good" },
            "no-source": { description: "missing source" },
            "not-an-object": "nope",
            "null-entry": null,
          },
        }),
        { status: 200 },
      )) as typeof fetch;
    const index = await loadRegistryIndex("https://example.com/registry.json");
    expect(Object.keys(index.modules)).toEqual(["good"]);
  });
});

describe("lookupEntry", () => {
  test("finds an entry by namespace/name key", () => {
    const found = lookupEntry(sampleIndex, { namespace: "damatjs", name: "user" });
    expect(found?.key).toBe("damatjs/user");
  });

  test("falls back to the bare name when namespaced key is absent", () => {
    const found = lookupEntry(sampleIndex, { name: "billing" });
    expect(found?.key).toBe("billing");
  });

  test("prefers the namespaced key over the bare name", () => {
    const index: RegistryIndex = {
      modules: {
        "damatjs/user": { source: "ns" },
        user: { source: "bare" },
      },
    };
    const found = lookupEntry(index, { namespace: "damatjs", name: "user" });
    expect(found?.key).toBe("damatjs/user");
    expect(found?.entry.source).toBe("ns");
  });

  test("returns null when nothing matches", () => {
    expect(lookupEntry(sampleIndex, { name: "ghost" })).toBeNull();
  });
});
