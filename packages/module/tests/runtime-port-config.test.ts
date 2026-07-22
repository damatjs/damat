import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  buildModuleAppConfig,
  DEFAULT_MODULE_PORT,
  type ModuleManifest,
} from "../src";

const manifest = { name: "user" } as ModuleManifest;
let savedPort: string | undefined;

beforeEach(() => {
  savedPort = process.env.PORT;
  delete process.env.PORT;
});

afterEach(() => {
  if (savedPort === undefined) delete process.env.PORT;
  else process.env.PORT = savedPort;
});

describe("module runtime port config", () => {
  test("explicit port wins over environment and config", () => {
    process.env.PORT = "5000";
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest,
      moduleConfig: { projectConfig: { http: { port: 6000 } } },
      port: 4000,
    });
    expect(config.projectConfig.http.port).toBe(4000);
  });

  test("PORT wins over module config", () => {
    process.env.PORT = "5000";
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest,
      moduleConfig: { projectConfig: { http: { port: 6000 } } },
    });
    expect(config.projectConfig.http.port).toBe(5000);
  });

  test("module config overrides HTTP and project defaults", () => {
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest,
      moduleConfig: {
        projectConfig: { nodeEnv: "test", http: { host: "example.com" } },
      },
    });
    expect(config.projectConfig.nodeEnv).toBe("test");
    expect(config.projectConfig.http.host).toBe("example.com");
    expect(config.projectConfig.http.port).toBe(DEFAULT_MODULE_PORT);
  });

  test("module config supplies a port without other sources", () => {
    const config = buildModuleAppConfig({
      moduleDir: "/m",
      manifest,
      moduleConfig: { projectConfig: { http: { port: 6000 } } },
    });
    expect(config.projectConfig.http.port).toBe(6000);
  });
});
