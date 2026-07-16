import { describe, expect, mock, test } from "bun:test";
import type { DamatManifest } from "@damatjs/installer";
import { loadModuleProfile } from "../commands/module/profile/load";
import { resolveModuleInstall } from "../commands/module/shared/resolve";
import { createContext } from "./helpers";
import { artifact, manifest, request } from "./fixtures/installer";

describe("module profile loading", () => {
  test("reads universal module profiles and rejects other kinds", () => {
    const universal = mock(() => manifest());
    expect(loadModuleProfile("/source", {
      exists: () => true, universal, legacy: mock(() => ({} as never)),
    }).name).toBe("billing");
    expect(() => loadModuleProfile("/source", {
      exists: () => true,
      universal: () => ({ ...manifest(), kind: "kit" }) as DamatManifest,
      legacy: mock(() => ({} as never)),
    })).toThrow("kind must be module");
  });

  test("normalizes root and src legacy manifests", () => {
    const legacy = mock(() => ({ name: "legacy" } as never));
    const root = loadModuleProfile("/source", {
      exists: (path) => path.endsWith("module.json"),
      universal: mock(() => manifest()), legacy,
    });
    const nested = loadModuleProfile("/source", {
      exists: () => false, universal: mock(() => manifest()), legacy,
    });
    expect(root.install?.provides?.module?.from).toBe("**");
    expect(nested.install?.provides?.module?.from).toBe("src/**");
  });
});

describe("module artifact resolution", () => {
  test("uses receiver mappings and CLI targets", async () => {
    const { ctx } = createContext({});
    const resolvedArtifact = artifact();
    const origin = mock(() => request);
    const recipe = mock(() => ({ schemaVersion: 1, id: "billing", kind: "module" }));
    const result = await resolveModuleInstall(ctx, "/source", {
      resolve: mock(async () => resolvedArtifact), origin,
      ports: mock(() => ({} as never)), loadProfile: mock(() => manifest()),
      exists: () => true, readManifest: mock(() => manifest("receiver")),
      options: mock(() => ({ targets: { routes: "custom/{id}" } })), recipe,
    });
    expect(origin).toHaveBeenCalledWith("/source", "/project");
    expect(recipe.mock.calls[0]?.[0]).toHaveProperty("receiver.name", "receiver");
    expect(result.options.targets?.routes).toBe("custom/{id}");
  });

  test("accepts parsed origins and cleans up profile failures", async () => {
    const cleanup = mock(() => {});
    const { ctx } = createContext({});
    await expect(resolveModuleInstall(ctx, request, {
      resolve: mock(async () => artifact(cleanup)), origin: mock(() => request),
      ports: mock(() => ({} as never)), loadProfile: mock(() => { throw new Error("bad"); }),
      exists: () => false, readManifest: mock(() => manifest()),
      options: mock(() => ({})), recipe: mock(() => ({} as never)),
    })).rejects.toThrow("bad");
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
