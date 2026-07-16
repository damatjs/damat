import type { GuideSectionDefinition } from "../types";

export const sharingSection: GuideSectionDefinition = {
  id: "modules-and-sharing",
  title: "Modules & sharing",
  chapters: [
    {
      id: "authoring-modules",
      title: "Authoring a module",
      summary:
        "Build one self-contained, single-purpose module (the blade) and test it in isolation.",
    },
    {
      id: "installing-modules",
      title: "Installing existing modules",
      summary:
        "damat module add / remove / update from a registry ref, path, or git.",
    },
    {
      id: "publishing-modules",
      title: "Publishing modules",
      summary:
        "List a module in a registry — damat module publish, verification, running your own registry.",
      file: "14b-publishing-modules.md",
      order: 14.5,
    },
    {
      id: "installing-modules-with-ai",
      title: "Installing modules with AI (MCP)",
      summary: "Discover and install modules through the MCP server.",
    },
    {
      id: "module-capabilities",
      title: "Module capabilities",
      summary:
        "Everything one module can do — the full model/service/config/migration/codegen/workflow/test/packaging surface.",
    },
    {
      id: "composing-and-linking-modules",
      title: "Composing & linking modules",
      summary:
        "The backend owner's job: getModule, cross-module links, pairsWith hints, and wiring modules into the app.",
    },
  ],
};
