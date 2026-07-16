import { describe, expect, test } from "bun:test";
import { matchProfiles, type DamatManifest } from "../../index";

const provider: DamatManifest = {
  schemaVersion: 1,
  kind: "module",
  name: "billing",
  install: {
    provides: {
      routes: { from: "routes/**", fallbackTo: "src/routes/{id}" },
      workflows: { from: "workflows/**", fallbackTo: "src/flows/{id}" },
    },
  },
};
const receiver: DamatManifest = {
  schemaVersion: 1,
  kind: "application",
  name: "api",
  install: { accepts: { routes: { to: "app/routes/{id}" } } },
};

describe("matchProfiles", () => {
  test("uses override, then receiver, then provider fallback", () => {
    const matches = matchProfiles({
      provider,
      receiver,
      overrides: { targets: { workflows: "custom/{id}" } },
    });
    expect(matches).toEqual([
      {
        capability: "routes",
        from: "routes/**",
        to: "app/routes/billing",
        source: "receiver",
      },
      {
        capability: "workflows",
        from: "workflows/**",
        to: "custom/billing",
        source: "override",
      },
    ]);
  });

  test("uses fallback without receiver and names unmatched capability", () => {
    expect(
      matchProfiles({ provider }).every((match) => match.source === "fallback"),
    ).toBeTrue();
    const unmatched = structuredClone(provider);
    delete unmatched.install?.provides?.routes.fallbackTo;
    expect(() => matchProfiles({ provider: unmatched })).toThrow("routes");
  });
});
