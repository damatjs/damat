import Link from "next/link";
import { ArrowRightIcon } from "@/assets/icons/arrowRight";
import { docsUrl } from "@/lib/constants";
import { Principles } from "@/modules/about/components/principles";
import { Stack } from "@/modules/about/components/stack";
import { Story } from "@/modules/about/components/story";
import { PageHeader } from "@/modules/layout/components/pageHeader";

/** /about — the project's reason to exist, principles, and foundations. */
export function AboutTemplate() {
  return (
    <div className="mx-auto max-w-7xl border-line lg:border-x">
      <PageHeader eyebrow="About" title="A backend you assemble, not inherit.">
        Damat is an open-source, MIT-licensed backend framework for TypeScript
        on Bun. Instead of one monolith&apos;s opinions, you compose exactly the
        backend your app needs from plug-and-play modules.
      </PageHeader>

      <Story />
      <Principles />
      <Stack />

      <section className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-12 lg:px-10">
        <p className="max-w-xl text-base leading-relaxed text-muted">
          The concepts guide explains how config, modules, services, and
          workflows fit together.
        </p>
        <Link
          href={docsUrl("concepts")}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-canvas transition-opacity hover:opacity-85"
        >
          Read the concepts guide
          <ArrowRightIcon width={15} height={15} />
        </Link>
      </section>
    </div>
  );
}
