import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { NO_REGISTRY_MSG } from "../constants";
import { listModules } from "../tools/list-modules";
import { moduleInfo } from "../tools/module-info";
import { searchModules } from "../tools/search-modules";
import type { RegistryIndex } from "../registry/types";

const index: RegistryIndex = {
  modules: {
    "damatjs/user": {
      source: "github:damatjs/user",
      description: "User management and auth",
      keywords: ["auth", "identity"],
      latest: "0.2.0",
      versions: { "0.1.0": "a", "0.2.0": "b" },
      verification: { status: "verified" },
      owner: { namespace: "damatjs" },
    },
    billing: {
      source: "github:acme/billing",
      description: "Stripe billing",
      keywords: ["payments"],
    },
  },
};

let tmp: string;
const saved = process.env.DAMAT_MODULE_REGISTRY;

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "mcp-tools-"));
  writeFileSync(join(tmp, "registry.json"), JSON.stringify(index));
  process.env.DAMAT_MODULE_REGISTRY = join(tmp, "registry.json");
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
  if (saved === undefined) delete process.env.DAMAT_MODULE_REGISTRY;
  else process.env.DAMAT_MODULE_REGISTRY = saved;
});

describe("list_modules", () => {
  test("returns every module summarized", async () => {
    const res = await listModules.handler({});
    expect(res.isError).toBeFalsy();
    const payload = JSON.parse(res.text);
    expect(payload.count).toBe(2);
    expect(payload.modules.map((m: any) => m.ref).sort()).toEqual([
      "billing",
      "damatjs/user",
    ]);
    const user = payload.modules.find((m: any) => m.ref === "damatjs/user");
    expect(user.verification).toBe("verified");
    expect(user.versions).toEqual(["0.1.0", "0.2.0"]);
  });

  test("returns the no-registry envelope when unset", async () => {
    delete process.env.DAMAT_MODULE_REGISTRY;
    const res = await listModules.handler({});
    expect(res.isError).toBe(true);
    expect(res.text).toBe(NO_REGISTRY_MSG);
  });
});

describe("search_modules", () => {
  test("matches against description (case-insensitive)", async () => {
    const res = await searchModules.handler({ query: "STRIPE" });
    const payload = JSON.parse(res.text);
    expect(payload.count).toBe(1);
    expect(payload.modules[0].ref).toBe("billing");
  });

  test("matches against keywords", async () => {
    const res = await searchModules.handler({ query: "identity" });
    const payload = JSON.parse(res.text);
    expect(payload.modules.map((m: any) => m.ref)).toEqual(["damatjs/user"]);
  });

  test("matches against the module key/ref", async () => {
    const res = await searchModules.handler({ query: "damatjs/user" });
    const payload = JSON.parse(res.text);
    expect(payload.count).toBe(1);
  });

  test("returns count 0 with no matches", async () => {
    const res = await searchModules.handler({ query: "nonexistent-xyz" });
    const payload = JSON.parse(res.text);
    expect(payload.count).toBe(0);
    expect(payload.modules).toEqual([]);
  });

  test("returns the no-registry envelope when unset", async () => {
    delete process.env.DAMAT_MODULE_REGISTRY;
    const res = await searchModules.handler({ query: "x" });
    expect(res.isError).toBe(true);
    expect(res.text).toBe(NO_REGISTRY_MSG);
  });
});

describe("module_info", () => {
  test("returns details for a namespaced ref", async () => {
    const res = await moduleInfo.handler({ ref: "damatjs/user" });
    expect(res.isError).toBeFalsy();
    const payload = JSON.parse(res.text);
    expect(payload.ref).toBe("damatjs/user");
    expect(payload.description).toBe("User management and auth");
  });

  test("resolves a bare name to its entry", async () => {
    const res = await moduleInfo.handler({ ref: "billing" });
    const payload = JSON.parse(res.text);
    expect(payload.ref).toBe("billing");
  });

  test("rejects an invalid ref string", async () => {
    const res = await moduleInfo.handler({ ref: "Not A Ref!" });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/not a valid module ref/);
  });

  test("errors when the registry has no such module", async () => {
    const res = await moduleInfo.handler({ ref: "ghost" });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/no module "ghost"/);
  });

  test("returns the no-registry envelope when unset", async () => {
    delete process.env.DAMAT_MODULE_REGISTRY;
    const res = await moduleInfo.handler({ ref: "user" });
    expect(res.isError).toBe(true);
    expect(res.text).toBe(NO_REGISTRY_MSG);
  });
});
