import { describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { scanUsage } from "../../index";
import { tempProject } from "../fixtures/project";

describe("scanUsage", () => {
  test("reports literal file and line matches while excluding managed paths", () => {
    const project = tempProject({
      "src/use.ts": "first\nuseBlade()\n",
      "src/owned.ts": "useBlade()",
      "src/binary.bin": "a\0useBlade",
    });
    mkdirSync(join(project, "node_modules/pkg"), { recursive: true });
    writeFileSync(join(project, "node_modules/pkg/index.ts"), "useBlade()");
    const report = scanUsage(
      project,
      [{ token: "useBlade", targets: ["src/**/*.ts"] }],
      ["src/owned.ts"],
    );
    expect(report.matches).toEqual([
      { token: "useBlade", path: "src/use.ts", line: 2, column: 1 },
    ]);
    expect(report.warning).toContain("advisory");
  });

  test("is deterministic and requires literal non-empty tokens", () => {
    const project = tempProject({ "b.ts": "token", "a.ts": "token" });
    expect(
      scanUsage(project, [{ token: "token" }], []).matches.map(
        ({ path }) => path,
      ),
    ).toEqual(["a.ts", "b.ts"]);
    expect(() => scanUsage(project, [{ token: "" }], [])).toThrow("token");
  });
});
