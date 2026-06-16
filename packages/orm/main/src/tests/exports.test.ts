import { describe, it, expect } from "bun:test";

/**
 * `@damatjs/orm` is an aggregator: its entry points are pure `export *`
 * re-exports of the underlying ORM packages. These smoke tests guard the
 * re-export wiring — if a sub-package's export resolution breaks, importing the
 * namespace throws; if an `export *` line is dropped from the barrel, the
 * aggregate stops sharing keys with that sub-package and the test fails.
 */

import * as ormIndex from "../index";
import * as model from "../model";
import * as connector from "../connector";
import * as migration from "../migration";
import * as processor from "../processor";
import * as pg from "../pg";

const subpaths = {
  model,
  connector,
  migration,
  processor,
  pg,
} as const;

describe("@damatjs/orm subpath entry points", () => {
  for (const [name, mod] of Object.entries(subpaths)) {
    it(`./${name} resolves to a non-empty namespace`, () => {
      expect(mod).toBeDefined();
      expect(Object.keys(mod).length).toBeGreaterThan(0);
    });
  }
});

describe("@damatjs/orm aggregated index", () => {
  it("re-exports a non-empty namespace", () => {
    expect(Object.keys(ormIndex).length).toBeGreaterThan(0);
  });

  it("aggregates at least as many exports as the largest sub-package", () => {
    const largest = Math.max(
      ...Object.values(subpaths).map((m) => Object.keys(m).length),
    );
    expect(Object.keys(ormIndex).length).toBeGreaterThanOrEqual(largest);
  });

  for (const [name, mod] of Object.entries(subpaths)) {
    it(`includes exports originating from ./${name}`, () => {
      const aggregateKeys = new Set(Object.keys(ormIndex));
      const shared = Object.keys(mod).filter((k) => aggregateKeys.has(k));
      // `export *` drops names that collide across sub-packages, so we only
      // require that *some* of each package's surface survives into the barrel.
      expect(shared.length).toBeGreaterThan(0);
    });
  }
});
