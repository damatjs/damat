import Link from "next/link";
import { GitHubIcon } from "@/assets/icons/gitHub";
import { docsUrl, GITHUB_URL, REGISTRY_URL } from "@/lib/constants";
import { LogoMark } from "@/modules/layout/components/logo";

const COLUMNS: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}[] = [
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

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-7xl border-line px-4 py-16 sm:px-6 lg:border-x lg:px-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-7">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark />
              <span className="text-base font-semibold tracking-tight text-ink">
                Damat
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              The composable backend framework for TypeScript — assemble exactly
              what your app needs from plug-and-play modules.
            </p>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:bg-subtle hover:text-ink"
            >
              <GitHubIcon width={16} height={16} />
              Star on GitHub
            </a>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-medium text-ink">{col.title}</p>
              <ul className="mt-3.5 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="text-sm text-muted transition-colors hover:text-ink"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col justify-between gap-3 border-t border-line pt-6 text-sm text-faint sm:flex-row sm:items-center">
          <p>Built with Bun, Hono, Effect-TS, &amp; PostgreSQL.</p>
          <p>MIT Licensed · © {new Date().getFullYear()} Damat</p>
        </div>
      </div>
    </footer>
  );
}
