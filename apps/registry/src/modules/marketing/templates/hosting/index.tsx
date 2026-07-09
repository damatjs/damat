import { CopyButton } from "@/modules/common/components/copyButton";
import { Shell } from "@/modules/layout/components/shell";
import { CtaBand } from "@/modules/marketing/components/ctaBand";
import { GhostNumeral } from "@/modules/marketing/components/ghostNumeral";
import { SectionHeading } from "@/modules/marketing/components/sectionHeading";
import { TerminalFeed } from "@/modules/marketing/components/terminalFeed";
import {
  CHANNELS,
  COMPAT,
  HOSTING_HERO,
  PUBLISH_TERMINAL,
} from "@/modules/marketing/data/hosting";
import { NPMRC_SNIPPET } from "@/modules/marketing/data/shared";

export function HostingTemplate() {
  return (
    <Shell>
      <header className="relative overflow-hidden py-6">
        <GhostNumeral
          value="npm"
          className="-right-6 top-0 text-[9rem] sm:text-[13rem]"
        />
        <div className="relative max-w-2xl">
          <p className="eyebrow">{HOSTING_HERO.eyebrow}</p>
          <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">
            {HOSTING_HERO.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            {HOSTING_HERO.lead}
          </p>
        </div>
      </header>

      <section className="mt-14 border-t border-line pt-12">
        <SectionHeading
          eyebrow="Publish"
          title="Push with the tools you already have."
          lead="Token-authed npm publish. Every published version is stored permanently, integrity-verified, and scanned like everything else."
        />
        <TerminalFeed
          lines={PUBLISH_TERMINAL}
          animated={false}
          className="mt-8 max-w-3xl"
        />
      </section>

      <section className="mt-14 border-t border-line pt-12">
        <SectionHeading
          eyebrow={CHANNELS.eyebrow}
          title={CHANNELS.title}
          lead={CHANNELS.lead}
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-line bg-surface p-5">
            <p className="text-sm font-semibold text-ink">
              {CHANNELS.npm.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {CHANNELS.npm.body}
            </p>
            <TerminalFeed
              lines={CHANNELS.npm.lines}
              animated={false}
              className="mt-4"
            />
          </div>
          <div className="flex flex-col rounded-lg border border-brand bg-[var(--accent-soft)] p-5">
            <p className="text-sm font-semibold text-brand">
              {CHANNELS.sourceCopy.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {CHANNELS.sourceCopy.body}
            </p>
            <TerminalFeed
              lines={CHANNELS.sourceCopy.lines}
              animated={false}
              className="mt-4"
            />
          </div>
        </div>
      </section>

      <section className="mt-14 border-t border-line pt-12">
        <SectionHeading
          eyebrow={COMPAT.eyebrow}
          title={COMPAT.title}
          lead={COMPAT.lead}
        />
        <div className="cmd mt-8 max-w-lg justify-between">
          <span className="truncate text-muted">{NPMRC_SNIPPET}</span>
          <CopyButton text={NPMRC_SNIPPET} />
        </div>
      </section>

      <div className="mt-16">
        <CtaBand />
      </div>
    </Shell>
  );
}
