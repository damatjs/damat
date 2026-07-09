import Link from "next/link";
import type { Module } from "@/lib/registry";
import { Shell } from "@/modules/layout/components/shell";
import { CtaBand } from "@/modules/marketing/components/ctaBand";
import { GhostNumeral } from "@/modules/marketing/components/ghostNumeral";
import { Pipeline } from "@/modules/marketing/components/pipeline";
import { SectionHeading } from "@/modules/marketing/components/sectionHeading";
import { TerminalFeed } from "@/modules/marketing/components/terminalFeed";
import { VerdictCard } from "@/modules/marketing/components/verdictCard";
import {
  AGENTS_SECTION,
  CHANNELS_SECTION,
  HERO,
  HERO_TERMINAL,
  HOSTING_SECTION,
  MODULES_SECTION,
  PROXY_SECTION,
  VERDICT_EXAMPLES,
} from "@/modules/marketing/data/home";
import { PIPELINE } from "@/modules/marketing/data/shared";
import { VerifiedBadge } from "@/modules/registry/components/verifiedBadge";

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand transition-opacity hover:opacity-80"
    >
      {label} →
    </Link>
  );
}

export function HomeTemplate({ modules }: { modules: Module[] }) {
  const featured = modules.slice(0, 4);
  const verified = modules.filter((m) => m.verified).length;

  return (
    <>
      {/* 1 · Hero */}
      <Shell>
        <header className="relative overflow-hidden py-10 sm:py-16">
          <GhostNumeral
            value="96"
            className="-right-10 -top-4 text-[14rem] sm:text-[22rem]"
          />
          <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--accent-ring)] bg-[var(--accent-soft)] px-3 py-1">
                ● {HERO.eyebrow}
              </p>
              <h1 className="display mt-5 text-4xl text-ink sm:text-6xl">
                {HERO.titleTop}
                <br />
                {HERO.titleBottom}{" "}
                <span className="text-brand">{HERO.titleAccent}</span>
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
                {HERO.lead}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={HERO.primaryCta.href} className="btn-primary">
                  {HERO.primaryCta.label} →
                </Link>
                <Link
                  href={HERO.secondaryCta.href}
                  className="inline-flex h-10 items-center rounded-lg border border-line-strong px-4 text-sm text-muted transition-colors hover:text-ink"
                >
                  {HERO.secondaryCta.label}
                </Link>
              </div>
            </div>
            <TerminalFeed lines={HERO_TERMINAL} />
          </div>
        </header>

        {/* 2 · Pipeline */}
        <section className="mt-10 border-t border-line pt-12">
          <SectionHeading
            eyebrow="The pipeline"
            title="Six stages between a release and your tree."
          />
          <div className="mt-8">
            <Pipeline stages={PIPELINE} />
          </div>
        </section>
      </Shell>

      {/* 3 · Safety layer for npm — dark band in both themes */}
      <section className="dark mt-16 bg-canvas py-16">
        <div className="mx-auto max-w-shell px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={PROXY_SECTION.eyebrow}
            title={PROXY_SECTION.title}
            lead={PROXY_SECTION.lead}
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {VERDICT_EXAMPLES.map((example) => (
              <VerdictCard key={example.pkg} example={example} />
            ))}
          </div>
          <SectionLink href="/security" label="How scanning & gating work" />
        </div>
      </section>

      <Shell>
        {/* 4 · Host with us */}
        <section className="mt-16 pt-2">
          <SectionHeading
            eyebrow={HOSTING_SECTION.eyebrow}
            title={HOSTING_SECTION.title}
            lead={HOSTING_SECTION.lead}
          />
          <SectionLink
            href={HOSTING_SECTION.cta.href}
            label={HOSTING_SECTION.cta.label}
          />
        </section>

        {/* 5 · Two ways to install */}
        <section className="mt-14 border-t border-line pt-12">
          <SectionHeading
            eyebrow={CHANNELS_SECTION.eyebrow}
            title={CHANNELS_SECTION.title}
            lead={CHANNELS_SECTION.lead}
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <TerminalFeed lines={CHANNELS_SECTION.npm} animated={false} />
            <TerminalFeed
              lines={CHANNELS_SECTION.sourceCopy}
              animated={false}
            />
          </div>
        </section>

        {/* 6 · Built for AI agents */}
        <section className="mt-14 border-t border-line pt-12">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <SectionHeading
                eyebrow={AGENTS_SECTION.eyebrow}
                title={AGENTS_SECTION.title}
                lead={AGENTS_SECTION.lead}
              />
              <SectionLink
                href={AGENTS_SECTION.cta.href}
                label={AGENTS_SECTION.cta.label}
              />
            </div>
            <pre className="term overflow-x-auto p-5 text-code leading-relaxed">
              <code>{AGENTS_SECTION.snippet}</code>
            </pre>
          </div>
        </section>

        {/* 7 · Damat modules (real data) */}
        <section className="mt-14 border-t border-line pt-12">
          <SectionHeading
            eyebrow={MODULES_SECTION.eyebrow}
            title={MODULES_SECTION.title}
            lead={MODULES_SECTION.lead}
          />
          <p className="mt-4 text-sm text-faint">
            <strong className="text-ink">{modules.length}</strong> modules ·{" "}
            <strong className="text-ink">{verified}</strong> verified
          </p>
          <ul
            className="mt-6 grid gap-3 sm:grid-cols-2"
            aria-label="Featured modules"
          >
            {featured.map((mod) => (
              <li key={mod.key}>
                <Link
                  href={`/modules/${mod.key}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-code text-ink">
                      {mod.key}
                    </span>
                    {mod.description ? (
                      <span className="mt-1 block truncate text-sm text-muted">
                        {mod.description}
                      </span>
                    ) : null}
                  </span>
                  {mod.verified ? <VerifiedBadge module={mod} /> : null}
                </Link>
              </li>
            ))}
          </ul>
          <SectionLink
            href={MODULES_SECTION.cta.href}
            label={MODULES_SECTION.cta.label}
          />
        </section>

        {/* 8 · CTA */}
        <div className="mt-16">
          <CtaBand />
        </div>
      </Shell>
    </>
  );
}
