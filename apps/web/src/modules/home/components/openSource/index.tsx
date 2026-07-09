import Link from "next/link";
import { ArrowRightIcon } from "@/assets/icons/arrowRight";
import { GitHubIcon } from "@/assets/icons/gitHub";
import { GITHUB_URL } from "@/lib/constants";
import type { SiteStats } from "@/lib/data/stats";

/** Numbers are counted from the repo at build time — they can't go stale. */
export function OpenSource({ stats }: { stats: SiteStats }) {
  const cells: Array<[string, string]> = [
    [`v${stats.version}`, "current release — every package moves in lockstep"],
    [String(stats.packages), "published packages, one public monorepo"],
    [
      String(stats.guideChapters),
      "guide chapters, from first model to deployment",
    ],
    ["MIT", "licensed — no open core, no paid tier"],
  ];

  return (
    <section className="border-t border-line px-6 py-20 lg:px-10">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
        <div>
          <p className="eyebrow">Open source</p>
          <h2 className="display mt-3 max-w-xl text-3xl font-semibold leading-heading text-ink sm:text-4xl">
            One public repo. Nothing held back.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            The framework, the ORM, the workflow engine, the CLI, the docs, and
            the registry index all live side by side in a single MIT-licensed
            monorepo. What you deploy is code you can read — and every release
            ships a note saying exactly what changed and how to move to it.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-subtle"
            >
              <GitHubIcon width={15} height={15} />
              Star on GitHub
            </a>
            <Link
              href="/releases"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand"
            >
              Read the release notes
              <ArrowRightIcon width={13} height={13} />
            </Link>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
          {cells.map(([value, label]) => (
            <div key={label} className="bg-canvas p-5 sm:p-6">
              <dt className="sr-only">{label}</dt>
              <dd className="display text-3xl font-medium text-ink">{value}</dd>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {label}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
