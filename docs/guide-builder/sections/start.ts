import type { GuideSectionDefinition } from "../types";

export const startSection: GuideSectionDefinition = {
  id: "start-here",
  title: "Start here",
  chapters: [
    {
      id: "introduction",
      title: "Introduction",
      summary: "What Damat is and the package map.",
    },
    {
      id: "concepts",
      title: "Concepts — modules & the framework",
      summary:
        "The idea behind Damat: what a module is, why the backend is shaped this way, and how the framework wires modules together.",
    },
    {
      id: "getting-started",
      title: "Getting started",
      summary:
        "Install, scaffold a new app or run the reference backend, and the project structure.",
    },
    {
      id: "configuration",
      title: "Configuration & environment",
      summary: "damat.config.ts, projectConfig, and the .env cascade.",
    },
  ],
};
