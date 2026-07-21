import { expect, test } from "bun:test";
import { mapArtifactFiles, selectInstallMode } from "../../index";
import { tempProject } from "../fixtures/project";

test("maps wildcard suffixes and rejects recipe-undeclared requested modes", () => {
  const root = tempProject({ "src/nested/a.ts": "a" });
  const files = mapArtifactFiles(root, {
    schemaVersion: 1,
    id: "blade",
    kind: "module",
    mappings: [{ from: "src/**", to: "target" }],
  });
  expect(files[0]?.target).toBe("target/nested/a.ts");
  expect(() =>
    selectInstallMode(
      "package",
      {
        schemaVersion: 1,
        id: "blade",
        kind: "module",
        install: { modes: ["source"] },
      },
      ["source", "package"],
    ),
  ).toThrow("not declared");
});
