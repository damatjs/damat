import { Shell } from "@/modules/layout/components/shell";
import { CtaBand } from "@/modules/marketing/components/ctaBand";
import { GhostNumeral } from "@/modules/marketing/components/ghostNumeral";
import { SectionHeading } from "@/modules/marketing/components/sectionHeading";
import {
  AGENT_FLOW,
  AGENTS_HERO,
  MCP,
  VERDICT_API,
} from "@/modules/marketing/data/agents";

export function AgentsTemplate() {
  return (
    <Shell>
      <header className="relative overflow-hidden py-6">
        <GhostNumeral
          value="?"
          className="-right-2 top-0 text-[10rem] sm:text-[14rem]"
        />
        <div className="relative max-w-2xl">
          <p className="eyebrow">{AGENTS_HERO.eyebrow}</p>
          <h1 className="display mt-3 text-4xl text-ink sm:text-5xl">
            {AGENTS_HERO.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted">
            {AGENTS_HERO.lead}
          </p>
        </div>
      </header>

      <section className="mt-14 border-t border-line pt-12">
        <div className="relative max-w-2xl">
          <p className="eyebrow">{VERDICT_API.eyebrow}</p>
          <h2 className="mt-3 font-mono text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {VERDICT_API.title}
          </h2>
          <p className="mt-4 text-md leading-relaxed text-muted">
            {VERDICT_API.lead}
          </p>
        </div>
        <pre className="term mt-8 max-w-3xl overflow-x-auto p-5 text-code leading-relaxed">
          <code>{VERDICT_API.response}</code>
        </pre>
      </section>

      <section className="mt-14 border-t border-line pt-12">
        <SectionHeading
          eyebrow="The loop"
          title="Four steps, no trust falls."
        />
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AGENT_FLOW.map((item, i) => (
            <li
              key={item.step}
              className="rounded-lg border border-line bg-surface p-4"
            >
              <span className="font-mono text-2xs text-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="mt-1 text-sm font-semibold text-ink">{item.step}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {item.detail}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 border-t border-line pt-12">
        <SectionHeading
          eyebrow={MCP.eyebrow}
          title={MCP.title}
          lead={MCP.lead}
        />
      </section>

      <div className="mt-16">
        <CtaBand />
      </div>
    </Shell>
  );
}
