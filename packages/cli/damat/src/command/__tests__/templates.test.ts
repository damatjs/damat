import { describe, it, expect } from "bun:test";
import {
  toCamel,
  toPascal,
  packageJsonTemplate,
  tsconfigTemplate,
  manifestTemplate,
  moduleConfigTemplate,
  entryTemplate,
  serviceTemplate,
  contractTestTemplate,
  envExampleTemplate,
  gitignoreTemplate,
  readmeTemplate,
  configSchemaTemplate,
  configLoadTemplate,
  configIndexTemplate,
} from "../module/scaffold/templates";

/**
 * The scaffold templates are pure string-builders. Call each one with
 * representative args and assert a load-bearing fragment so every line is
 * exercised. They touch no fs / no boundary, so no setup mock is needed.
 */

describe("scaffold/templates string helpers", () => {
  it("toCamel converts kebab segments", () => {
    expect(toCamel("user-management")).toBe("userManagement");
    expect(toCamel("user")).toBe("user");
    expect(toCamel("a-1-b")).toBe("a1B");
  });

  it("toPascal upper-cases the first camelized char", () => {
    expect(toPascal("user-management")).toBe("UserManagement");
    expect(toPascal("user")).toBe("User");
  });
});

describe("scaffold/templates file builders", () => {
  it("packageJsonTemplate names the scoped package and wires scripts", () => {
    const out = packageJsonTemplate("user");
    const json = JSON.parse(out);
    expect(json.name).toBe("@damatjs-modules/user");
    expect(json.scripts.dev).toBe("damat module dev");
    expect(json.dependencies["@damatjs/module"]).toBe("latest");
    expect(out.endsWith("\n")).toBe(true);
  });

  it("tsconfigTemplate writes portable aliases for the module id", () => {
    const out = tsconfigTemplate("user");
    const json = JSON.parse(out);
    expect(json.compilerOptions.paths["@user/*"]).toEqual(["./src/*"]);
    expect(json.compilerOptions.paths["@workflows"]).toEqual(["./src/workflows"]);
    expect(json.compilerOptions.paths["@workflows/*"]).toEqual([
      "./src/workflows/*",
    ]);
  });

  it("manifestTemplate records name/version/paths", () => {
    const json = JSON.parse(manifestTemplate("user"));
    expect(json.name).toBe("user");
    expect(json.version).toBe("0.0.1");
    expect(json.paths.models).toBe("./models");
  });

  it("moduleConfigTemplate references defineModuleConfig", () => {
    expect(moduleConfigTemplate()).toContain("defineModuleConfig");
  });

  it("entryTemplate wires the service class and module id", () => {
    const out = entryTemplate("user", "UserService");
    expect(out).toContain('export const MODULE_ID = "user";');
    expect(out).toContain("export { UserService, models };");
    expect(out).toContain("service: UserService,");
  });

  it("serviceTemplate emits the service class", () => {
    const out = serviceTemplate("UserService");
    expect(out).toContain("export class UserService extends ModuleService");
  });

  it("contractTestTemplate references validateModuleDir", () => {
    const out = contractTestTemplate("user");
    expect(out).toContain("user module contract");
    expect(out).toContain("validateModuleDir");
  });

  it("envExampleTemplate ships a DATABASE_URL line", () => {
    expect(envExampleTemplate()).toContain("DATABASE_URL=");
  });

  it("gitignoreTemplate ignores node_modules and .env", () => {
    const out = gitignoreTemplate();
    expect(out).toContain("node_modules");
    expect(out).toContain(".env");
  });

  it("readmeTemplate embeds the module name", () => {
    const out = readmeTemplate("user");
    expect(out).toContain("# user");
    expect(out).toContain('getModule("user")');
  });

  it("config templates render schema/load/index", () => {
    expect(configSchemaTemplate()).toContain("z.object({})");
    expect(configLoadTemplate()).toContain("export const load");
    expect(configIndexTemplate()).toContain("export default");
  });
});
