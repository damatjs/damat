import { Shell } from "@/modules/layout/components/shell";
import { CtaBand } from "@/modules/marketing/components/ctaBand";
import { GhostNumeral } from "@/modules/marketing/components/ghostNumeral";
import { Pipeline } from "@/modules/marketing/components/pipeline";
import { SectionHeading } from "@/modules/marketing/components/sectionHeading";
import { TerminalFeed } from "@/modules/marketing/components/terminalFeed";
import {
  BLOCKED_TERMINAL,
  POLICIES,
  SCAN_RULES,
  SCORING,
  SECURITY_HERO,
} from "@/modules/marketing/data/security";
import { PIPELINE } from "@/modules/marketing/data/shared";

export function SecurityTemplate() {
  return (
    <Shell>
      <header className="relative overflow-hidden py-6">
        <GhostNumeral
          value="0–100"
          className="-right-8 top-0 text-[9rem] sm:text-[13rem]"
        />
        <div className="relative max-w-2xl">
          <p className="eyebrow">{SECURITY_HERO.eyebrow}</p>
          <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">
            {SECURITY_HERO.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            {SECURITY_HERO.lead}
          </p>
        </div>
      </header>

      <section className="mt-14 border-t border-line pt-12">
        <SectionHeading
          eyebrow="The pipeline"
          title="Six stages between a release and your tree."
        />
        <div className="mt-8">
          <Pipeline stages={PIPELINE} />
        </div>
      </section>

      <section className="mt-14 border-t border-line pt-12">
        <SectionHeading
          eyebrow="Static analysis"
          title="The rules that catch the classics."
        />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SCAN_RULES.map((rule) => (
            <div
              key={rule.title}
              className="rounded-lg border border-line bg-surface p-4"
            >
              <p className="text-sm font-semibold text-ink">{rule.title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {rule.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 border-t border-line pt-12">
        <SectionHeading
          eyebrow={SCORING.eyebrow}
          title={SCORING.title}
          lead={SCORING.lead}
        />
        <div className="mt-8 overflow-hidden rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="bg-subtle text-2xs uppercase tracking-wider text-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium">Score</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">What happens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {SCORING.thresholds.map((row) => (
                <tr key={row.status}>
                  <td className="px-4 py-3 font-mono text-code text-ink">
                    {row.range}
                  </td>
                  <td className="px-4 py-3 font-mono text-code text-brand">
                    {row.status}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14 border-t border-line pt-12">
        <SectionHeading
          eyebrow={POLICIES.eyebrow}
          title={POLICIES.title}
          lead={POLICIES.lead}
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {POLICIES.modes.map((m) => (
            <div
              key={m.mode}
              className="rounded-lg border border-line bg-surface p-4"
            >
              <p className="font-mono text-code text-brand">{m.mode}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 border-t border-line pt-12">
        <SectionHeading
          eyebrow="Anatomy of a block"
          title="What a stopped attack looks like."
          lead="npm prints the verdict body — your terminal tells you exactly why the install never happened."
        />
        <TerminalFeed
          lines={BLOCKED_TERMINAL}
          animated={false}
          className="mt-8 max-w-3xl"
        />
      </section>

      <div className="mt-16">
        <CtaBand />
      </div>
    </Shell>
  );
}
