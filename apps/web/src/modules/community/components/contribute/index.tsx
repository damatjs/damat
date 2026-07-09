import Link from "next/link";
import { ArrowRightIcon } from "@/assets/icons/arrowRight";
import { docsUrl, GITHUB_URL } from "@/lib/constants";

/** Concrete ways in, ordered by effort. */
const PATHS = [
  {
    title: "Publish a module",
    body: "The highest-leverage contribution: package a feature as a module and list it in the registry for everyone.",
    href: "/modules",
    label: "How publishing works",
    external: false,
  },
  {
    title: "Improve the docs",
    body: "The guide and every package README live in the repo. Spotted something unclear? Edit and PR it.",
    href: `${GITHUB_URL}/tree/main/docs`,
    label: "Browse the docs source",
    external: true,
  },
  {
    title: "Work on the framework",
    body: "The monorepo README maps every package; each one ships its own docs folder for maintainers.",
    href: GITHUB_URL,
    label: "Read the repo map",
    external: true,
  },
  {
    title: "Build with AI",
    body: "Damat ships an MCP server so AI assistants can search the registry and install modules for you.",
    href: docsUrl("installing-modules-with-ai"),
    label: "Set up the MCP server",
    external: false,
  },
];

export function Contribute() {
  return (
    <section className="border-t border-line px-6 py-16 lg:px-10">
      <h2 className="display text-2xl font-semibold text-ink sm:text-3xl">
        Ways to contribute
      </h2>
      <div className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
        {PATHS.map((path) => (
          <div key={path.title}>
            <h3 className="text-sm font-medium text-ink">{path.title}</h3>
            <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted">
              {path.body}
            </p>
            {path.external ? (
              <a
                href={path.href}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand"
              >
                {path.label}
                <ArrowRightIcon width={13} height={13} />
              </a>
            ) : (
              <Link
                href={path.href}
                className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand"
              >
                {path.label}
                <ArrowRightIcon width={13} height={13} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
