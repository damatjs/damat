/**
 * Tests for verdict-aware module_info and related registry helpers.
 *
 * All network calls are intercepted via globalThis.fetch — no real HTTP.
 * Covers:
 *   1. summarizeEntry surfaces a static verdict from the entry.
 *   2. summarizeEntry accepts a live verdict override.
 *   3. fetchVerdict derives the gateway URL and fetches the verdict.
 *   4. fetchVerdict returns null gracefully on network errors / local paths.
 *   5. module_info includes verdict when the registry is a hosted URL.
 *   6. module_info verdict is omitted (not an error) for local file registries.
 *   7. A flagged module is surfaced as status "flagged" in module_info output.
 *   8. DAMAT_MODULE_REGISTRY pointing at a URL selects the hosted registry
 *      while a local file path still works normally.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { clearRegistryCache, fetchVerdict } from "../registry/load";
import { summarizeEntry } from "../registry/summarize";
import { moduleInfo } from "../tools/module-info";
import type { RegistryIndex, RegistryModuleEntry, RegistryVerdict } from "../registry/types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const verdictPass: RegistryVerdict = {
  status: "pass",
  score: 95,
  reasons: [],
  summary: "No issues found",
  checkedAt: "2026-07-10T00:00:00Z",
};

const verdictFlagged: RegistryVerdict = {
  status: "flagged",
  score: 30,
  reasons: ["obfuscated code", "suspicious network calls"],
  summary: "Module contains suspicious patterns",
  checkedAt: "2026-07-10T00:00:00Z",
};

const entryWithStaticVerdict: RegistryModuleEntry = {
  source: "github:damatjs/user",
  description: "User management",
  latest: "0.2.0",
  verification: { status: "verified" },
  owner: { namespace: "damatjs", verified: true },
  verdict: verdictPass,
};

const entryNoVerdict: RegistryModuleEntry = {
  source: "github:acme/billing",
  description: "Stripe billing",
  latest: "1.0.0",
};

// ---------------------------------------------------------------------------
// 1. summarizeEntry — static verdict from entry
// ---------------------------------------------------------------------------

describe("summarizeEntry — verdict field", () => {
  test("surfaces a static verdict baked into the entry", () => {
    const summary = summarizeEntry("damatjs/user", entryWithStaticVerdict);
    expect(summary.verdict).toEqual({
      status: "pass",
      score: 95,
      reasons: [],
      summary: "No issues found",
    });
  });

  test("omits verdict when neither entry.verdict nor override is provided", () => {
    const summary = summarizeEntry("billing", entryNoVerdict);
    expect(summary.verdict).toBeUndefined();
  });

  test("live override takes precedence over static entry.verdict", () => {
    const summary = summarizeEntry("damatjs/user", entryWithStaticVerdict, verdictFlagged);
    expect(summary.verdict?.status).toBe("flagged");
    expect(summary.verdict?.reasons).toEqual(["obfuscated code", "suspicious network calls"]);
  });

  test("live verdict with null score/reasons/summary normalises to null", () => {
    const unscanned: RegistryVerdict = { status: "unscanned" };
    const summary = summarizeEntry("damatjs/user", entryWithStaticVerdict, unscanned);
    expect(summary.verdict).toEqual({
      status: "unscanned",
      score: null,
      reasons: null,
      summary: null,
    });
  });

  test("verdict override of null falls back to static entry.verdict", () => {
    const summary = summarizeEntry("damatjs/user", entryWithStaticVerdict, null);
    expect(summary.verdict?.status).toBe("pass");
  });

  test("still surfaces verification alongside verdict", () => {
    const summary = summarizeEntry("damatjs/user", entryWithStaticVerdict);
    expect(summary.verification).toBe("verified");
    expect(summary.verdict?.status).toBe("pass");
  });
});

// ---------------------------------------------------------------------------
// 2. fetchVerdict
// ---------------------------------------------------------------------------

describe("fetchVerdict", () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
    clearRegistryCache();
  });

  test("returns null for a local file path (not a URL)", async () => {
    const result = await fetchVerdict("/tmp/registry.json", "damatjs/user", "0.2.0");
    expect(result).toBeNull();
  });

  test("returns null for a local directory path", async () => {
    const result = await fetchVerdict("/tmp/my-registry", "damatjs/user", "0.2.0");
    expect(result).toBeNull();
  });

  test("fetches from the gateway verdict endpoint and returns the payload", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify(verdictPass), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    const result = await fetchVerdict(
      "https://registry.damatjs.com/api/damat/modules",
      "damatjs/user",
      "0.2.0",
    );

    expect(result).not.toBeNull();
    expect(result?.status).toBe("pass");
    expect(result?.score).toBe(95);
    // Confirm the URL hits the gateway verdict endpoint
    expect(capturedUrl).toContain("/api/registry/packages/damatjs%2Fuser/0.2.0/verdict");
  });

  test("returns null when the gateway returns a non-OK status", async () => {
    globalThis.fetch = (async () =>
      new Response("not found", { status: 404 })) as typeof fetch;
    const result = await fetchVerdict(
      "https://registry.damatjs.com/api/damat/modules",
      "damatjs/user",
      "0.2.0",
    );
    expect(result).toBeNull();
  });

  test("returns null when the network is unreachable (graceful degradation)", async () => {
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fetch;
    const result = await fetchVerdict(
      "https://registry.damatjs.com/api/damat/modules",
      "damatjs/user",
      "0.2.0",
    );
    expect(result).toBeNull();
  });

  test("returns null when the gateway returns invalid JSON", async () => {
    globalThis.fetch = (async () =>
      new Response("<html>error</html>", { status: 200 })) as typeof fetch;
    const result = await fetchVerdict(
      "https://registry.damatjs.com/api/damat/modules",
      "damatjs/user",
      "0.2.0",
    );
    expect(result).toBeNull();
  });

  test("returns null when the response JSON lacks a status field", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ score: 50 }), { status: 200 })) as typeof fetch;
    const result = await fetchVerdict(
      "https://registry.damatjs.com/api/damat/modules",
      "damatjs/user",
      "0.2.0",
    );
    expect(result).toBeNull();
  });

  test("URL-encodes slashes in the module name", async () => {
    let capturedUrl: string | undefined;
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify(verdictPass), { status: 200 });
    }) as typeof fetch;

    await fetchVerdict(
      "https://registry.damatjs.com/api/damat/modules",
      "damatjs/user",
      "0.2.0",
    );
    // "damatjs/user" → "damatjs%2Fuser" in the URL path
    expect(capturedUrl).toContain("damatjs%2Fuser");
  });

  test("falls back to origin when registry URL has no known suffix (plain host + path)", async () => {
    // A URL with no known suffix pattern — e.g. a raw registry.json at a custom path
    // that doesn't match /api/damat/modules. The gateway base should fall back to the host.
    let capturedUrl: string | undefined;
    globalThis.fetch = (async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify(verdictPass), { status: 200 });
    }) as typeof fetch;

    await fetchVerdict(
      "https://custom.registry.io/some/other/path",
      "mymodule",
      "1.0.0",
    );
    // With no known suffix stripped, falls back to https://custom.registry.io
    expect(capturedUrl).toContain("https://custom.registry.io/api/registry/packages/mymodule/1.0.0/verdict");
  });
});

// ---------------------------------------------------------------------------
// 3. module_info — verdict integration (hosted registry)
// ---------------------------------------------------------------------------

describe("module_info — verdict integration", () => {
  const realFetch = globalThis.fetch;
  let tmp: string;
  const savedRegistry = process.env.DAMAT_MODULE_REGISTRY;

  const hostedIndex: RegistryIndex = {
    modules: {
      "damatjs/user": {
        source: "github:damatjs/user",
        description: "User management and auth",
        latest: "0.2.0",
        verification: { status: "verified" },
        owner: { namespace: "damatjs" },
      },
      "acme/evil": {
        source: "github:acme/evil",
        description: "Suspicious package",
        latest: "1.0.0",
        verification: { status: "unverified" },
      },
    },
  };

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "mcp-verdict-"));
    clearRegistryCache();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    rmSync(tmp, { recursive: true, force: true });
    clearRegistryCache();
    if (savedRegistry === undefined) delete process.env.DAMAT_MODULE_REGISTRY;
    else process.env.DAMAT_MODULE_REGISTRY = savedRegistry;
  });

  test("module_info includes verdict when the registry is a hosted URL (pass)", async () => {
    // First fetch call = index, second call = verdict
    let _callCount = 0;
    globalThis.fetch = (async (url: string | URL | Request) => {
      _callCount++;
      const urlStr = String(url);
      if (urlStr.includes("/verdict")) {
        return new Response(JSON.stringify(verdictPass), { status: 200 });
      }
      return new Response(JSON.stringify(hostedIndex), { status: 200 });
    }) as typeof fetch;

    process.env.DAMAT_MODULE_REGISTRY = "https://registry.damatjs.com/api/damat/modules";

    const res = await moduleInfo.handler({ ref: "damatjs/user" });
    expect(res.isError).toBeFalsy();
    const payload = JSON.parse(res.text);
    expect(payload.verdict).toBeDefined();
    expect(payload.verdict.status).toBe("pass");
    expect(payload.verdict.score).toBe(95);
    expect(payload.verification).toBe("verified");
  });

  test("module_info surfaces 'flagged' verdict for a suspicious module", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/verdict")) {
        return new Response(JSON.stringify(verdictFlagged), { status: 200 });
      }
      return new Response(JSON.stringify(hostedIndex), { status: 200 });
    }) as typeof fetch;

    process.env.DAMAT_MODULE_REGISTRY = "https://registry.damatjs.com/api/damat/modules";

    const res = await moduleInfo.handler({ ref: "acme/evil" });
    const payload = JSON.parse(res.text);
    expect(payload.verdict.status).toBe("flagged");
    expect(payload.verdict.reasons).toContain("obfuscated code");
    expect(payload.verdict.summary).toBe("Module contains suspicious patterns");
  });

  test("module_info omits verdict gracefully when gateway verdict fetch fails", async () => {
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/verdict")) {
        // Verdict endpoint is down
        throw new Error("ECONNREFUSED");
      }
      return new Response(JSON.stringify(hostedIndex), { status: 200 });
    }) as typeof fetch;

    process.env.DAMAT_MODULE_REGISTRY = "https://registry.damatjs.com/api/damat/modules";

    const res = await moduleInfo.handler({ ref: "damatjs/user" });
    expect(res.isError).toBeFalsy(); // not an error — verdict is just absent
    const payload = JSON.parse(res.text);
    expect(payload.verdict).toBeUndefined();
    expect(payload.verification).toBe("verified"); // verification still present
  });

  test("module_info omits verdict for a local file registry", async () => {
    // Write a local registry.json — no fetch mock needed (file-based)
    const registryFile = join(tmp, "registry.json");
    const localIndex: RegistryIndex = {
      modules: {
        "damatjs/user": {
          source: "github:damatjs/user",
          description: "User management",
          latest: "0.2.0",
          verification: { status: "verified" },
        },
      },
    };
    writeFileSync(registryFile, JSON.stringify(localIndex));
    process.env.DAMAT_MODULE_REGISTRY = registryFile;

    // Intercept fetch to assert it is NOT called for the verdict
    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const res = await moduleInfo.handler({ ref: "damatjs/user" });
    expect(res.isError).toBeFalsy();
    const payload = JSON.parse(res.text);
    expect(payload.verdict).toBeUndefined();
    expect(fetchCalled).toBe(false); // no network call for local registry
  });

  test("module_info surfaces a static verdict from the index entry (no live fetch needed)", async () => {
    const indexWithStaticVerdict: RegistryIndex = {
      modules: {
        "damatjs/user": {
          source: "github:damatjs/user",
          description: "User management",
          latest: "0.2.0",
          verification: { status: "verified" },
          verdict: verdictPass,
        },
      },
    };
    const registryFile = join(tmp, "registry.json");
    writeFileSync(registryFile, JSON.stringify(indexWithStaticVerdict));
    process.env.DAMAT_MODULE_REGISTRY = registryFile;

    // No live fetch mock — static verdict should still appear
    const res = await moduleInfo.handler({ ref: "damatjs/user" });
    const payload = JSON.parse(res.text);
    expect(payload.verdict?.status).toBe("pass");
    expect(payload.verdict?.score).toBe(95);
  });
});

// ---------------------------------------------------------------------------
// 4. DAMAT_MODULE_REGISTRY — URL vs file path selection
// ---------------------------------------------------------------------------

describe("DAMAT_MODULE_REGISTRY — URL vs local path", () => {
  const realFetch = globalThis.fetch;
  let tmp: string;
  const savedRegistry = process.env.DAMAT_MODULE_REGISTRY;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "mcp-reg-sel-"));
    clearRegistryCache();
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    rmSync(tmp, { recursive: true, force: true });
    clearRegistryCache();
    if (savedRegistry === undefined) delete process.env.DAMAT_MODULE_REGISTRY;
    else process.env.DAMAT_MODULE_REGISTRY = savedRegistry;
  });

  test("URL registry uses HTTP fetch", async () => {
    let fetchCalled = false;
    const remoteIndex: RegistryIndex = {
      modules: {
        "damatjs/user": { source: "github:damatjs/user", description: "remote" },
      },
    };
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("/verdict")) {
        return new Response(JSON.stringify({ status: "unscanned" }), { status: 200 });
      }
      fetchCalled = true;
      return new Response(JSON.stringify(remoteIndex), { status: 200 });
    }) as typeof fetch;

    process.env.DAMAT_MODULE_REGISTRY = "https://registry.damatjs.com/api/damat/modules";

    const res = await moduleInfo.handler({ ref: "damatjs/user" });
    expect(res.isError).toBeFalsy();
    expect(fetchCalled).toBe(true);
    const payload = JSON.parse(res.text);
    expect(payload.description).toBe("remote");
  });

  test("local file path registry reads from disk without HTTP", async () => {
    const registryFile = join(tmp, "registry.json");
    const localIndex: RegistryIndex = {
      modules: {
        "damatjs/user": { source: "github:damatjs/user", description: "local" },
      },
    };
    writeFileSync(registryFile, JSON.stringify(localIndex));
    process.env.DAMAT_MODULE_REGISTRY = registryFile;

    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const res = await moduleInfo.handler({ ref: "damatjs/user" });
    expect(res.isError).toBeFalsy();
    expect(fetchCalled).toBe(false);
    const payload = JSON.parse(res.text);
    expect(payload.description).toBe("local");
  });
});
