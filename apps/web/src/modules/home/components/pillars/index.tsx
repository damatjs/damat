import Link from "next/link";
import { ArrowRightIcon } from "@/assets/icons/arrowRight";
import { docsUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PILLARS = [
  {
    title: "Modules",
    body: "Self-contained features you author in isolation and install anywhere.",
    href: docsUrl("concepts"),
  },
  {
    title: "ORM",
    body: "Typed models over PostgreSQL with real migrations and generated CRUD.",
    href: docsUrl("models"),
  },
  {
    title: "HTTP",
    body: "File-based routes on Hono with per-route validation and middleware.",
    href: docsUrl("http-apis"),
  },
  {
    title: "Workflows",
    body: "Multi-step sagas with retries, timeouts, and compensation.",
    href: docsUrl("workflows"),
  },
  {
    title: "Agent tools",
    body: "One CLI for everything — exposed to AI agents over MCP.",
    href: docsUrl("cli-reference"),
  },
];

/** The five product pillars as a hairline-divided strip. */
export function Pillars() {
  return (
    <section className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-5">
      {PILLARS.map((pillar, i) => (
        <Link
          key={pillar.title}
          href={pillar.href}
          className={cn(
            "group border-line px-6 py-8 transition-colors hover:bg-subtle lg:px-7",
            i > 0 && "border-t sm:border-t-0 lg:border-l",
            i % 2 === 1 && "sm:border-l",
            i >= 2 && "sm:border-t lg:border-t-0",
          )}
        >
          <h3 className="flex items-center gap-2 text-md font-semibold text-ink">
            {pillar.title}
            <ArrowRightIcon
              width={13}
              height={13}
              className="text-faint opacity-0 transition-opacity group-hover:opacity-100"
            />
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {pillar.body}
          </p>
        </Link>
      ))}
    </section>
  );
}
