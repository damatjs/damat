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
      title: "Concepts and architecture",
      summary:
        "Modules, durable primitives, PostgreSQL authority, Redis acceleration, pools, and runtime roles.",
    },
    {
      id: "getting-started",
      title: "Getting started",
      summary:
        "Scaffold a backend, collect database credentials, create and migrate PostgreSQL, and understand the project structure.",
    },
    {
      id: "configuration",
      title: "Configuration & environment",
      summary:
        "damat.config.ts, runtime workers, durability policy, and the environment cascade.",
    },
  ],
};
