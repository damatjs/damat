import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { requireDatabaseUrl } from "../cli/config/index";
import { loadModules, loadDatabaseUrl } from "../cli/utils/load";

/**
 * Residual-coverage tests for the CLI, closing the lines the existing suites
 * don't reach. No real database and no real project: throwaway os.tmpdir()
 * config files exercise the real loaders, and a logger/process-exit stub
 * covers requireDatabaseUrl's failure path WITHOUT killing the test runner.
 *
 * NOTE: this suite deliberately avoids `mock.module` — it only uses real
 * source + temp files, so nothing leaks into other suites.
 */

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orm-cli-cov-"));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function writeConfig(name: string, contents: string): string {
  const p = path.join(tmpRoot, name);
  fs.writeFileSync(p, contents, "utf-8");
  return p;
}

// ---------------------------------------------------------------------------
// requireDatabaseUrl — missing-env failure path (console output + process.exit)
// ---------------------------------------------------------------------------
describe("requireDatabaseUrl — DATABASE_URL missing", () => {
  const originalDbUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDbUrl !== undefined) process.env.DATABASE_URL = originalDbUrl;
    else delete process.env.DATABASE_URL;
  });

  it("logs guidance and calls process.exit(1) when DATABASE_URL is unset", () => {
    delete process.env.DATABASE_URL;

    const errors: string[] = [];
    const logger = {
      error: (m: string) => errors.push(String(m)),
      info: () => {},
      success: () => {},
      warn: () => {},
      skip: () => {},
    };

    // Stub console.log + process.exit so the error path runs without noise or
    // actually terminating the runner. process.exit is made to throw so control
    // does not fall through to `return url` (which would be undefined here).
    const realLog = console.log;
    const realExit = process.exit;
    const logged: string[] = [];
    let exitCode: number | undefined;
    console.log = ((...args: unknown[]) => {
      logged.push(args.map(String).join(" "));
    }) as typeof console.log;
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error("__exit__");
    }) as typeof process.exit;

    try {
      expect(() => requireDatabaseUrl(logger as any)).toThrow("__exit__");
    } finally {
      console.log = realLog;
      process.exit = realExit;
    }

    expect(exitCode).toBe(1);
    expect(errors.some((e) => /DATABASE_URL is not set/.test(e))).toBe(true);
    expect(logged.some((l) => /DATABASE_URL=postgresql:/.test(l))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// loadModules — config.links resolves per-owner link migration modules
// ---------------------------------------------------------------------------
describe("loadModules — link migration modules", () => {
  it("registers each links/<owner> dir as a link:<owner> module", async () => {
    // Build a links tree: src/links/orders/index.ts (a real entry index).
    const linksDir = path.join(tmpRoot, "src", "links", "orders");
    fs.mkdirSync(linksDir, { recursive: true });
    fs.writeFileSync(path.join(linksDir, "index.ts"), "export default {};");

    const configPath = writeConfig(
      "links.config.ts",
      `export default {
         modules: { user: { resolve: "./src/modules/user" } },
         links: "./src/links",
       };`,
    );

    const modules = await loadModules<Record<string, any>>(configPath);

    // The real module plus the discovered link module.
    expect(modules.user).toBeDefined();
    expect(modules["link:orders"]).toBeDefined();
    expect(modules["link:orders"].kind).toBe("link");
    expect(modules["link:orders"].resolve).toBe(linksDir);
  });

  it("never clobbers a real module that shares an id with a link entry", async () => {
    const linksDir = path.join(tmpRoot, "src", "links", "orders");
    fs.mkdirSync(linksDir, { recursive: true });
    fs.writeFileSync(path.join(linksDir, "index.ts"), "export default {};");

    // A real module explicitly registered under the same id the link would use.
    const configPath = writeConfig(
      "links-clash.config.ts",
      `export default {
         modules: { real: { id: "link:orders", resolve: "./src/modules/real" } },
         links: "./src/links",
       };`,
    );

    const modules = await loadModules<Record<string, any>>(configPath);
    // The real module wins; the link entry is skipped (no `kind: "link"`).
    expect(modules["link:orders"].kind).toBeUndefined();
    expect(modules["link:orders"].name).toBe("real");
  });
});

// ---------------------------------------------------------------------------
// loadModules / loadDatabaseUrl — catch-block branches
// ---------------------------------------------------------------------------
describe("loadModules — catch re-throws our own 'Config file not found'", () => {
  it("passes a 'Config file not found' error from inside the try straight through", async () => {
    // The config module itself throws an error whose message starts with the
    // sentinel, so loadModules' catch re-throws it verbatim (not wrapped).
    const configPath = writeConfig(
      "rethrow.config.ts",
      `throw new Error("Config file not found: synthetic");`,
    );

    await expect(loadModules(configPath)).rejects.toThrow(
      "Config file not found: synthetic",
    );
    await expect(loadModules(configPath)).rejects.not.toThrow(
      /Failed to load config/,
    );
  });
});

describe("loadDatabaseUrl — catch-block branches", () => {
  it("re-throws our own 'Config file not found' error untouched", async () => {
    const configPath = writeConfig(
      "db-rethrow.config.ts",
      `throw new Error("Config file not found: db-synthetic");`,
    );

    await expect(loadDatabaseUrl(configPath)).rejects.toThrow(
      "Config file not found: db-synthetic",
    );
  });

  it("wraps any other load/access failure in a descriptive error", async () => {
    // `projectConfig` is a throwing getter: loadModules never touches it (so it
    // would succeed), but loadDatabaseUrl reads projectConfig.databaseUrl first,
    // hitting the getter and landing in the wrapping catch.
    const configPath = writeConfig(
      "db-wrap.config.ts",
      `export default {
         get projectConfig() { throw new Error("getter boom"); },
         modules: { user: { resolve: "./m" } },
       };`,
    );

    await expect(loadDatabaseUrl(configPath)).rejects.toThrow(
      /Failed to load database URL from/,
    );
    // And the same file loads fine for modules (proving the asymmetry is real).
    const modules = await loadModules<Record<string, any>>(configPath);
    expect(modules.user).toBeDefined();
  });
});
