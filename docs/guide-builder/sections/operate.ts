import type { GuideSectionDefinition } from "../types";

export const operateSection: GuideSectionDefinition = {
  id: "operate-and-reference",
  title: "Operate & reference",
  chapters: [
    {
      id: "cli-reference",
      title: "CLI reference",
      summary: "damat and damat-orm.",
    },
    {
      id: "deployment",
      title: "Deployment",
      summary: "Docker and production release flow.",
    },
    {
      id: "package-reference",
      title: "Package reference",
      summary: "Links to every package's README and internals.",
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      summary: "Common symptoms and fixes.",
    },
  ],
};
