import { describe, expect, test } from "bun:test";
import {
  DAMAT_MANIFEST_FILENAME,
  parseDamatManifest,
} from "../../index";

describe("damat manifest", () => {
  test("parses a bidirectional provider and receiver", () => {
    const manifest = parseDamatManifest({
      schemaVersion: 1,
      kind: "module",
      name: "billing",
      install: {
        modes: ["source", "package"],
        default: "source",
        packageBackends: ["node", "damat"],
        provides: { module: { from: "src/**", fallbackTo: "src/billing" } },
        accepts: { routes: { to: "src/api/routes/{id}" } },
        instructions: { add: ["wire billing"], remove: ["unwire billing"] },
      },
      module: { entry: "./src/index.ts" },
    });

    expect(DAMAT_MANIFEST_FILENAME).toBe("damat.json");
    expect(manifest.install?.provides?.module.from).toBe("src/**");
    expect(manifest.install?.accepts?.routes.to).toBe("src/api/routes/{id}");
    expect(manifest.module?.entry).toBe("./src/index.ts");
    expect(manifest.install?.instructions?.add).toEqual(["wire billing"]);
  });

  test("accepts an application receiver without install config", () => {
    expect(
      parseDamatManifest({ schemaVersion: 1, kind: "application", name: "api" }),
    ).toEqual({ schemaVersion: 1, kind: "application", name: "api" });
  });
});
