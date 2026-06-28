import { afterEach, describe, expect, test } from "bun:test";

import { appDir, damatCli, registryLocation } from "../env";

const saved = {
  DAMAT_APP_DIR: process.env.DAMAT_APP_DIR,
  DAMAT_MODULE_REGISTRY: process.env.DAMAT_MODULE_REGISTRY,
  DAMAT_CLI: process.env.DAMAT_CLI,
};

function restore(key: keyof typeof saved) {
  if (saved[key] === undefined) delete process.env[key];
  else process.env[key] = saved[key];
}

afterEach(() => {
  restore("DAMAT_APP_DIR");
  restore("DAMAT_MODULE_REGISTRY");
  restore("DAMAT_CLI");
});

describe("appDir", () => {
  test("returns DAMAT_APP_DIR when set", () => {
    process.env.DAMAT_APP_DIR = "/srv/app";
    expect(appDir()).toBe("/srv/app");
  });

  test("falls back to cwd when unset", () => {
    delete process.env.DAMAT_APP_DIR;
    expect(appDir()).toBe(process.cwd());
  });

  test("falls back to cwd when set to empty string", () => {
    process.env.DAMAT_APP_DIR = "";
    expect(appDir()).toBe(process.cwd());
  });
});

describe("registryLocation", () => {
  test("returns the configured location", () => {
    process.env.DAMAT_MODULE_REGISTRY = "https://example.com/registry.json";
    expect(registryLocation()).toBe("https://example.com/registry.json");
  });

  test("returns undefined when unset", () => {
    delete process.env.DAMAT_MODULE_REGISTRY;
    expect(registryLocation()).toBeUndefined();
  });
});

describe("damatCli", () => {
  test("defaults to ['damat']", () => {
    delete process.env.DAMAT_CLI;
    expect(damatCli()).toEqual(["damat"]);
  });

  test("splits a multi-arg command into argv", () => {
    process.env.DAMAT_CLI = "bun /path/to/cli.ts";
    expect(damatCli()).toEqual(["bun", "/path/to/cli.ts"]);
  });

  test("collapses extra whitespace and drops empties", () => {
    process.env.DAMAT_CLI = "  bun   run   cli.ts  ";
    expect(damatCli()).toEqual(["bun", "run", "cli.ts"]);
  });

  test("falls back to ['damat'] for an empty string", () => {
    process.env.DAMAT_CLI = "";
    expect(damatCli()).toEqual(["damat"]);
  });
});
