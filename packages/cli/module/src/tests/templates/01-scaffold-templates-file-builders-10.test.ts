import {
  describe,
  it,
  expect,
  configSchemaTemplate,
  configLoadTemplate,
  configIndexTemplate,
} from "./context";

describe("scaffold/templates file builders", () => {
  it("config templates render schema/load/index", () => {
    expect(configSchemaTemplate()).toContain("z.object({})");
    expect(configLoadTemplate()).toContain("export const load");
    expect(configIndexTemplate()).toContain("export default");
  });
});
