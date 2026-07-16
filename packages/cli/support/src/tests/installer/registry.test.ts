import { afterEach, describe, expect, test } from "bun:test";
import {
  createRegistryResolver,
  loadRegistryIndex,
  registryDescriptor,
  type RegistryIo,
} from "../../installer/registry";

const savedRegistry = process.env.DAMAT_REGISTRY;
afterEach(() => {
  if (savedRegistry === undefined) delete process.env.DAMAT_REGISTRY;
  else process.env.DAMAT_REGISTRY = savedRegistry;
  delete process.env.DAMAT_MODULE_REGISTRY;
});

function io(json: unknown, directory = false): RegistryIo {
  return {
    exists: () => directory,
    isDirectory: () => directory,
    read: () => JSON.stringify(json),
    fetch: async () => ({ ok: true, status: 200, json: async () => json }),
  };
}

describe("registryDescriptor", () => {
  const index = { modules: { "damatjs/auth": {
    source: "github:damatjs/auth",
    owner: { namespace: "damatjs" },
    verification: { status: "verified", integrity: "sha256:abc" },
    versions: {
      "1.0.0": { source: "github:damatjs/auth#v1.0.0" },
      next: "github:damatjs/auth#next",
    },
  } } };

  test("pins version objects and preserves trust metadata", () => {
    expect(registryDescriptor(index, "damatjs/auth@1.0.0", "/app")).toEqual({
      origin: { type: "git", url: "https://github.com/damatjs/auth.git", ref: "v1.0.0" },
      owner: "damatjs", verification: "verified", integrity: "sha256:abc",
    });
  });

  test("supports short names, string versions, and unverified status", () => {
    const unverified = structuredClone(index);
    unverified.modules["damatjs/auth"].verification.status = "pending";
    expect(registryDescriptor(unverified, "auth@next", "/app"))
      .toMatchObject({ verification: "unverified", origin: { ref: "next" } });
  });

  test("rejects missing entries and versions", () => {
    expect(() => registryDescriptor({ modules: {} }, "missing", "/app"))
      .toThrow("registry entry not found");
    expect(() => registryDescriptor(index, "auth@missing", "/app"))
      .toThrow("registry version not found");
  });
});

describe("registry index loading", () => {
  const index = { modules: { auth: { source: "github:acme/auth" } } };

  test("loads URLs, files, and registry directories", async () => {
    expect(await loadRegistryIndex("https://registry.test", io(index))).toEqual(index);
    expect(await loadRegistryIndex("index.json", io(index))).toEqual(index);
    expect(await loadRegistryIndex("registry", io(index, true))).toEqual(index);
  });

  test("reports HTTP and missing-configuration failures", async () => {
    const failing = io(index);
    failing.fetch = async () => ({ ok: false, status: 503, json: async () => index });
    expect(loadRegistryIndex("https://registry.test", failing))
      .rejects.toThrow("registry request failed: 503");
    expect(createRegistryResolver("/app")("auth"))
      .rejects.toThrow("requires DAMAT_REGISTRY");
  });

  test("resolves configured registries with injected IO", async () => {
    process.env.DAMAT_REGISTRY = "index.json";
    expect(await createRegistryResolver("/app", io(index))("auth"))
      .toMatchObject({ origin: { type: "git" } });
  });
});
