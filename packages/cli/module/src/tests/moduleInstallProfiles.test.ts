import { describe, expect, test } from "bun:test";
import { createProfileRecipe, type DamatManifest } from "@damatjs/installer";
import {
  moduleCapabilities,
  normalizeLegacyModule,
} from "../commands/module/profile";

describe("module install profiles", () => {
  test("normalizes a legacy source with every Damat capability", () => {
    const profile = normalizeLegacyModule({
      name: "billing", packages: { zod: "^4" }, env: [{ name: "API_KEY" }],
    });
    expect(Object.keys(profile.install?.provides ?? {})).toEqual([
      "module", "routes", "workflows", "jobs", "events", "pipelines",
      "links", "tests", "migrations", "models", "types",
    ]);
    expect(profile.install?.instructions?.add?.join(" ")).toContain("damat.config.ts");
  });

  test("maps the provider into default and custom receiver layouts", () => {
    const provider: DamatManifest = {
      schemaVersion: 1, kind: "module", name: "billing",
      install: { provides: moduleCapabilities("src/") },
    };
    const nested = createProfileRecipe({ provider });
    const receiver: DamatManifest = {
      schemaVersion: 1, kind: "application", name: "api",
      install: { accepts: { routes: { to: "src/http/{id}" } } },
    };
    const custom = createProfileRecipe({ provider, receiver });
    expect(nested.mappings?.find((item) => item.from.includes("routes"))?.to)
      .toBe("src/modules/billing/api/routes");
    expect(custom.mappings?.find((item) => item.from.includes("routes"))?.to)
      .toBe("src/http/billing");
  });
});
