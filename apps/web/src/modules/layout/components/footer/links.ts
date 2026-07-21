import { docsUrl, GITHUB_URL, REGISTRY_URL } from "@/lib/constants";

export type FooterColumn = {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
};

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: "Project",
    links: [
      { label: "About", href: "/about" },
      { label: "Modules", href: "/modules" },
      { label: "Releases", href: "/releases" },
      { label: "Community", href: "/community" },
      { label: "Registry", href: REGISTRY_URL, external: true },
    ],
  },
  {
    title: "Guide",
    links: [
      { label: "Introduction", href: docsUrl("introduction") },
      { label: "Getting started", href: docsUrl("getting-started") },
      { label: "Concepts", href: docsUrl("concepts") },
      { label: "Configuration", href: docsUrl("configuration") },
    ],
  },
  {
    title: "Build",
    links: [
      { label: "Models & ORM", href: docsUrl("models") },
      { label: "HTTP APIs", href: docsUrl("http-apis") },
      { label: "Workflows", href: docsUrl("workflows") },
      { label: "Redis", href: docsUrl("redis") },
    ],
  },
  {
    title: "Modules",
    links: [
      { label: "Authoring a module", href: docsUrl("authoring-modules") },
      { label: "Installing modules", href: docsUrl("installing-modules") },
      { label: "With AI (MCP)", href: docsUrl("installing-modules-with-ai") },
      { label: "Capabilities", href: docsUrl("module-capabilities") },
    ],
  },
  {
    title: "Reference",
    links: [
      { label: "CLI reference", href: docsUrl("cli-reference") },
      { label: "Packages", href: docsUrl("package-reference") },
      { label: "Deployment", href: docsUrl("deployment") },
      { label: "GitHub", href: GITHUB_URL, external: true },
    ],
  },
];
