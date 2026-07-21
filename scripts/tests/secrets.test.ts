import { expect, test } from "bun:test";
import { scanText } from "../security/secrets";

test("detects representative provider credentials", () => {
  const github = `ghp_${"a".repeat(40)}`;
  const aws = `AKIA${"A".repeat(16)}`;
  expect(scanText("config.ts", `${github}\n${aws}`)).toEqual([
    { file: "config.ts", line: 1, kind: "GitHub token" },
    { file: "config.ts", line: 2, kind: "AWS access key" },
  ]);
});

test("supports an explicit false-positive annotation", () => {
  const key = `AIza${"a".repeat(35)}`;
  expect(scanText("docs.md", `${key} // secret-scan: allow`)).toEqual([]);
});
