import { describe, expect, test, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseModuleRef, resolveRegistryEntry } from "../src";

function tmp(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

const ENV_KEY = "DAMAT_MODULE_REGISTRY";
let saved: string | undefined;
afterEach(() => {
  if (saved === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = saved;
  saved = undefined;
});

describe("resolveRegistryEntry (source finalization branches)", () => {
  test("leaves absolute and url sources untouched", async () => {
    const dir = tmp("damat-reg-abs-");
    const indexFile = join(dir, "registry.json");
    writeFileSync(
      indexFile,
      JSON.stringify({
        modules: {
          abs: { source: "/opt/abs/module" },
          remote: { source: "https://github.com/acme/foo" },
          ssh: { source: "git@github.com:acme/foo.git" },
        },
      }),
    );
    try {
      expect(
        (await resolveRegistryEntry(parseModuleRef("abs")!, indexFile))?.source,
      ).toBe("/opt/abs/module");
      expect(
        (await resolveRegistryEntry(parseModuleRef("remote")!, indexFile))
          ?.source,
      ).toBe("https://github.com/acme/foo");
      expect(
        (await resolveRegistryEntry(parseModuleRef("ssh")!, indexFile))?.source,
      ).toBe("git@github.com:acme/foo.git");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("resolves a registry given as a directory (registry.json inside)", async () => {
    const dir = tmp("damat-reg-dir-");
    writeFileSync(
      join(dir, "registry.json"),
      JSON.stringify({ modules: { bar: { source: "./pkgs/bar" } } }),
    );
    try {
      // Pass the directory, not the file — registryIndexFile appends registry.json
      const r = await resolveRegistryEntry(parseModuleRef("bar")!, dir);
      expect(r?.source).toBe(join(dir, "pkgs", "bar"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("throws when a local index file does not exist", async () => {
    const missing = join(tmpdir(), "damat-reg-missing-xyz", "registry.json");
    await expect(
      resolveRegistryEntry(parseModuleRef("bar")!, missing),
    ).rejects.toThrow("Registry index not found");
  });

  test("throws when the index JSON has no modules object", async () => {
    const dir = tmp("damat-reg-badindex-");
    const indexFile = join(dir, "registry.json");
    writeFileSync(indexFile, JSON.stringify({ notModules: true }));
    try {
      await expect(
        resolveRegistryEntry(parseModuleRef("bar")!, indexFile),
      ).rejects.toThrow('must be JSON with a "modules" object');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("defaults the registry location to the env var", async () => {
    const dir = tmp("damat-reg-env-");
    const indexFile = join(dir, "registry.json");
    writeFileSync(
      indexFile,
      JSON.stringify({ modules: { bar: { source: "/abs/bar" } } }),
    );
    saved = process.env[ENV_KEY];
    process.env[ENV_KEY] = indexFile;
    try {
      const r = await resolveRegistryEntry(parseModuleRef("bar")!);
      expect(r?.source).toBe("/abs/bar");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("resolveRegistryEntry (http registry)", () => {
  test("fetches and validates a remote index", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      expect(url).toBe("https://registry.example.com/index.json");
      return {
        ok: true,
        status: 200,
        json: async () => ({ modules: { bar: { source: "/abs/bar" } } }),
      };
    }) as unknown as typeof fetch;
    try {
      const r = await resolveRegistryEntry(
        parseModuleRef("bar")!,
        "https://registry.example.com/index.json",
      );
      // url registry → source kept as-is (not resolved against a local dir)
      expect(r?.source).toBe("/abs/bar");
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("throws when the remote fetch is not ok", async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    try {
      await expect(
        resolveRegistryEntry(
          parseModuleRef("bar")!,
          "https://registry.example.com/index.json",
        ),
      ).rejects.toThrow("Registry fetch failed (503)");
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
