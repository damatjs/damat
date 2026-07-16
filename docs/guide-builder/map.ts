import { buildGuide } from "./guide";
import { buildPackageGroups } from "./package-map";

export function buildDocumentationMap(root: string) {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    name: "Damat documentation",
    description:
      "Navigation map for the Damat docs site: the step-by-step guide plus every package's overview and internals.",
    generatedBy: "docs/build-guide-json.ts",
    home: "README.md",
    guideIndex: "docs/GUIDE.md",
    topLevel: [
      {
        id: "readme",
        title: "Overview",
        path: "README.md",
        summary: "Top-level project overview and package index.",
      },
      {
        id: "guide",
        title: "The Damat Guide",
        path: "docs/GUIDE.md",
        summary:
          "The step-by-step usage guide (this map indexes its chapters).",
      },
      {
        id: "modules",
        title: "Module manifest contract",
        path: "MODULES.md",
        summary:
          "The module.json contract, registry refs, and the trust model.",
      },
      {
        id: "agents",
        title: "AI contributor guide",
        path: "AGENTS.md",
        summary:
          "Repo map, conventions, and common-task recipes for AI assistants.",
      },
    ],
    skills: [
      {
        id: "damat-modules",
        title: "Working with Damat modules",
        path: ".claude/skills/damat-modules/SKILL.md",
      },
      {
        id: "damat-backend",
        title: "Working in a Damat backend",
        path: ".claude/skills/damat-backend/SKILL.md",
      },
    ],
    guide: buildGuide(root),
    packages: buildPackageGroups(root),
    referenceApp: {
      name: "@damatjs/default",
      dir: "backend/default",
      readme: "backend/default/README.md",
    },
  };
}
