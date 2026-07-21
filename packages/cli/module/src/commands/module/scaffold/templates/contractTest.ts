export function contractTestTemplate(name: string): string {
  return `import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { validateModuleDir } from "@damatjs/module";

describe("${name} module contract", () => {
  test("module directory passes validation", () => {
    const report = validateModuleDir(join(import.meta.dir, "../"));
    expect(report.errors).toEqual([]);
    expect(report.valid).toBe(true);
  });
});
`;
}
