#!/usr/bin/env bun
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "prettier";
import { buildDocumentationMap } from "./guide-builder/map";

const root = join(import.meta.dir, "..");
const map = buildDocumentationMap(root);

const output = await format(JSON.stringify(map), { parser: "json" });
writeFileSync(join(root, "docs", "guide.json"), output);

const chapterCount = map.guide.reduce(
  (total, section) => total + section.chapters.length,
  0,
);
const packageCount = map.packages.reduce(
  (total, group) => total + group.packages.length,
  0,
);

console.log(
  `Wrote docs/guide.json — ${chapterCount} chapters, ${packageCount} packages.`,
);
