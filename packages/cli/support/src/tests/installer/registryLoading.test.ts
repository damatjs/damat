import { afterEach, describe, expect, test } from "bun:test";
import {
  createRegistryResolver,
  loadRegistryIndex,
  type RegistryIo,
} from "../../installer/registry";

const savedRegistry = process.env.DAMAT_REGISTRY;
afterEach(() => {
  if (savedRegistry === undefined) delete process.env.DAMAT_REGISTRY;
  else process.env.DAMAT_REGISTRY = savedRegistry;
  delete process.env.DAMAT_MODULE_REGISTRY;
});

function registryIo(json: unknown, directory = false): RegistryIo {
  return {
    exists: () => directory,
    isDirectory: () => directory,
    read: () => JSON.stringify(json),
    fetch: async () => ({ ok: true, status: 200, json: async () => json }),
  };
}

describe("registry index loading", () => {
  const index = { modules: { auth: { source: "github:acme/auth" } } };

  test("loads URLs, files, and registry directories", async () => {
    expect(
      await loadRegistryIndex("https://registry.test", registryIo(index)),
    ).toEqual(index);
    expect(await loadRegistryIndex("index.json", registryIo(index))).toEqual(
      index,
    );
    expect(
      await loadRegistryIndex("registry", registryIo(index, true)),
    ).toEqual(index);
  });

  test("reports HTTP and missing-configuration failures", async () => {
    const failing = registryIo(index);
    failing.fetch = async () => ({
      ok: false,
      status: 503,
      json: async () => index,
    });
    expect(loadRegistryIndex("https://registry.test", failing)).rejects.toThrow(
      "registry request failed: 503",
    );
    expect(createRegistryResolver("/app")("auth")).rejects.toThrow(
      "requires DAMAT_REGISTRY",
    );
  });

  test("resolves configured registries with injected IO", async () => {
    process.env.DAMAT_REGISTRY = "index.json";
    expect(
      await createRegistryResolver("/app", registryIo(index))("auth"),
    ).toMatchObject({ origin: { type: "git" } });
  });
});
